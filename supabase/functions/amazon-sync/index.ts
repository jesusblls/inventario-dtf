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

async function getOrders(accessToken: string, createdAfter: string) {
  try {
    const marketplaceId = Deno.env.get('AMAZON_MARKETPLACE_ID');
    
    // Format the date to ISO 8601 format without milliseconds
    const formattedDate = new Date(createdAfter).toISOString().split('.')[0] + 'Z';
    
    const headers = {
      'x-amz-access-token': accessToken,
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    };

    // Ensure marketplaceId is a string and properly formatted
    const params = new URLSearchParams({
      MarketplaceIds: marketplaceId!.trim(),
      CreatedAfter: formattedDate,
      MaxResultsPerPage: '100',
      OrderStatuses: 'Shipped,Unshipped'
    });

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
    return data.payload;
  } catch (error) {
    throw new Error(`Order items fetch failed: ${error.message}`);
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
    // Silently fail if we can't save history
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

    const results = [];
    const orderItems = [];
    const products = new Set();
    let successCount = 0;
    let errorCount = 0;

    for (const order of Orders) {
      try {
        const items = await getOrderItems(accessToken, order.AmazonOrderId);
        
        orderItems.push({
          orderId: order.AmazonOrderId,
          items: items.OrderItems
        });

        for (const item of items.OrderItems) {
          if (!products.has(item.ASIN)) {
            products.add(item.ASIN);
            
            const { error: productError } = await supabase
              .from('amazon_products')
              .upsert({
                asin: item.ASIN,
                title: item.Title,
                updated_at: new Date().toISOString(),
              }, {
                onConflict: 'asin'
              });

            if (productError) {
              errorCount++;
            } else {
              successCount++;
            }
          }
        }

        const { error: orderError } = await supabase.rpc('sync_amazon_order', {
          p_order_id: order.AmazonOrderId,
          p_status: order.OrderStatus
        });

        if (orderError) {
          errorCount++;
          results.push({ 
            orderId: order.AmazonOrderId, 
            error: orderError.message 
          });
        } else {
          successCount++;
          results.push({ 
            orderId: order.AmazonOrderId, 
            success: true 
          });
        }
      } catch (error) {
        errorCount++;
        results.push({ 
          orderId: order.AmazonOrderId, 
          error: `Failed to process order: ${error.message}` 
        });
      }
    }

    const totalProcessed = successCount + errorCount;
    const syncStatus = errorCount === 0 ? 'success' : 'partial';
    
    await saveSyncHistory(
      startDate,
      endDate,
      totalProcessed,
      syncStatus,
      errorCount > 0 ? `${errorCount} errors occurred during sync` : undefined
    );

    return new Response(
      JSON.stringify({ 
        success: true, 
        orders: Orders, 
        orderItems,
        products: Array.from(products),
        results,
        summary: {
          startDate,
          endDate,
          totalProcessed,
          successCount,
          errorCount
        },
        timestamp: new Date().toISOString()
      }), 
      { headers: corsHeaders }
    );
  } catch (error) {
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
        error: error.message || 'An unexpected error occurred',
        timestamp: new Date().toISOString()
      }), 
      { 
        status: 500, 
        headers: corsHeaders 
      }
    );
  }
});