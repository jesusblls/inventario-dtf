import { createClient } from 'npm:@supabase/supabase-js@2.39.7';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Content-Type': 'application/json',
};

async function validateEnvironment() {
  const requiredVars = [
    'AMAZON_REFRESH_TOKEN',
    'AMAZON_CLIENT_ID',
    'AMAZON_CLIENT_SECRET',
    'AMAZON_MARKETPLACE_ID',
    'SUPABASE_URL',
    'SUPABASE_SERVICE_ROLE_KEY'
  ];

  const missingVars = requiredVars.filter(varName => !Deno.env.get(varName));
  
  if (missingVars.length > 0) {
    throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
  }
}

async function getAccessToken() {
  try {
    const refreshToken = Deno.env.get('AMAZON_REFRESH_TOKEN');
    const clientId = Deno.env.get('AMAZON_CLIENT_ID');
    const clientSecret = Deno.env.get('AMAZON_CLIENT_SECRET');

    const response = await fetch('https://api.amazon.com/auth/o2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken!,
        client_id: clientId!,
        client_secret: clientSecret!,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to get access token: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    if (!data.access_token) {
      throw new Error('Access token not found in response');
    }

    return data.access_token;
  } catch (error) {
    throw new Error(`Authentication failed: ${error.message}`);
  }
}

async function getLastSyncDate() {
  try {
    const { data, error } = await supabase.rpc('get_last_sync_date');
    
    if (error) throw error;
    
    return data;
  } catch (error) {
    return '2023-01-01T00:00:00Z';
  }
}

async function getOrders(accessToken: string, createdAfter: string, nextToken?: string) {
  try {
    const marketplaceId = Deno.env.get('AMAZON_MARKETPLACE_ID');
    const formattedDate = new Date(createdAfter).toISOString().split('.')[0] + 'Z';
    
    const headers = {
      'x-amz-access-token': accessToken,
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    };

    const params = new URLSearchParams({
      MarketplaceIds: marketplaceId!.trim(),
      CreatedAfter: formattedDate,
      MaxResultsPerPage: '100',
      OrderStatuses: 'Shipped,Unshipped'
    });

    if (nextToken) {
      params.append('NextToken', nextToken);
    }

    const apiUrl = `https://sellingpartnerapi-na.amazon.com/orders/v0/orders?${params}`;

    const response = await fetch(apiUrl, { headers });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to get orders: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const data = await response.json();

    const filteredOrders = data.payload?.Orders?.filter(order => 
      order.OrderStatus === 'Shipped' || 
      order.OrderStatus === 'Unshipped'
    ) || [];
    
    // If there's a next token, recursively get more orders
    if (data.payload?.NextToken) {
      const nextPageResult = await getOrders(accessToken, createdAfter, data.payload.NextToken);
      return {
        Orders: [...filteredOrders, ...nextPageResult.Orders],
        payload: {
          ...data.payload,
          Orders: [...(data.payload.Orders || []), ...(nextPageResult.payload?.Orders || [])]
        }
      };
    }

    return {
      Orders: filteredOrders,
      payload: data.payload
    };
  } catch (error) {
    throw new Error(`Orders fetch failed: ${error.message}`);
  }
}

async function getOrderItems(accessToken: string, orderId: string) {
  try {
    const headers = {
      'x-amz-access-token': accessToken,
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    };

    const apiUrl = `https://sellingpartnerapi-na.amazon.com/orders/v0/orders/${orderId}/orderItems`;

    const response = await fetch(apiUrl, { headers });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to get order items: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return data.payload?.OrderItems || [];
  } catch (error) {
    console.error(`Error fetching items for order ${orderId}:`, error);
    return [];
  }
}

async function saveSyncHistory(startDate: string, endDate: string, itemsProcessed: number, status: string, errorMessage?: string) {
  try {
    const { error } = await supabase
      .from('sync_history')
      .insert({
        type: 'orders',
        start_date: startDate,
        end_date: endDate,
        items_processed: itemsProcessed,
        status,
        error_message: errorMessage
      });

    if (error) throw error;
  } catch (error) {
    console.error('Error saving sync history:', error);
  }
}

async function syncProduct(item: any) {
  try {
    // Check if product exists
    const { data: existingProduct } = await supabase
      .from('amazon_products')
      .select('id')
      .eq('asin', item.ASIN)
      .single();

    if (!existingProduct) {
      // Create new product
      const { error: insertError } = await supabase
        .from('amazon_products')
        .insert({
          asin: item.ASIN,
          title: item.Title,
          updated_at: new Date().toISOString(),
        });

      if (insertError) throw insertError;
    }

    return true;
  } catch (error) {
    console.error('Error syncing product:', item.ASIN, error);
    return false;
  }
}

async function syncOrder(accessToken: string, order: any) {
  try {
    // Get order items
    const items = await getOrderItems(accessToken, order.AmazonOrderId);
    
    // Sync products first
    for (const item of items) {
      await syncProduct(item);
    }

    // Sync order
    const { error } = await supabase.rpc('sync_amazon_order', {
      p_order_id: order.AmazonOrderId,
      p_status: order.OrderStatus
    });

    if (error) throw error;
    
    return {
      success: true,
      productsProcessed: items.length
    };
  } catch (error) {
    console.error('Error syncing order:', order.AmazonOrderId, error);
    return {
      success: false,
      productsProcessed: 0
    };
  }
}

Deno.serve(async (req) => {
  try {
    if (req.method === 'OPTIONS') {
      return new Response(null, { 
        status: 200,
        headers: corsHeaders 
      });
    }

    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Method not allowed' 
        }), 
        { 
          status: 405, 
          headers: corsHeaders 
        }
      );
    }

    await validateEnvironment();

    const lastSyncDate = await getLastSyncDate();
    const startDate = lastSyncDate;
    const endDate = new Date().toISOString();

    const accessToken = await getAccessToken();
    const { Orders } = await getOrders(accessToken, startDate);

    let successCount = 0;
    let errorCount = 0;
    let totalProductsProcessed = 0;

    // Process orders in batches to avoid overwhelming the database
    const batchSize = 50;
    for (let i = 0; i < Orders.length; i += batchSize) {
      const batch = Orders.slice(i, i + batchSize);
      const results = await Promise.all(
        batch.map(order => syncOrder(accessToken, order))
      );
      
      successCount += results.filter(r => r.success).length;
      errorCount += results.filter(r => !r.success).length;
      totalProductsProcessed += results.reduce((sum, r) => sum + r.productsProcessed, 0);
    }

    const syncStatus = errorCount === 0 ? 'success' : 'partial';
    
    await saveSyncHistory(
      startDate,
      endDate,
      Orders.length,
      syncStatus,
      errorCount > 0 ? `${errorCount} errors occurred during sync` : undefined
    );

    return new Response(
      JSON.stringify({ 
        success: true,
        summary: {
          totalOrders: Orders.length,
          successCount,
          errorCount,
          totalProductsProcessed,
          startDate,
          endDate
        }
      }), 
      { headers: corsHeaders }
    );
  } catch (error) {
    console.error('Sync error:', error);

    await saveSyncHistory(
      new Date().toISOString(),
      new Date().toISOString(),
      0,
      'error',
      error.message
    );

    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || 'An unexpected error occurred'
      }), 
      { 
        status: 500, 
        headers: corsHeaders 
      }
    );
  }
});