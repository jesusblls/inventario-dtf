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

async function getOrders(accessToken: string, nextToken?: string) {
  try {
    const createdAfter = '2023-01-01T00:00:00Z';
    console.log('📦 Obteniendo órdenes desde:', createdAfter);
    if (nextToken) {
      console.log('🔄 Usando NextToken:', nextToken);
    }

    const marketplaceId = Deno.env.get('AMAZON_MARKETPLACE_ID');
    
    const headers = {
      'x-amz-access-token': accessToken,
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    };

    const params = new URLSearchParams({
      MarketplaceIds: marketplaceId!.trim(),
      CreatedAfter: createdAfter,
      MaxResultsPerPage: '100',
      OrderStatuses: 'Shipped,Unshipped'
    });

    if (nextToken) {
      params.append('NextToken', nextToken);
    }

    const apiUrl = `https://sellingpartnerapi-na.amazon.com/orders/v0/orders?${params}`;
    console.log('🔍 URL de la API:', apiUrl);

    const response = await fetch(apiUrl, { headers });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Error en respuesta de órdenes:', errorText);
      throw new Error(`Failed to get orders: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const data = await response.json();
    console.log('📦 Respuesta de órdenes:', JSON.stringify(data, null, 2));

    const filteredOrders = data.payload?.Orders?.filter(order => 
      order.OrderStatus === 'Shipped' || 
      order.OrderStatus === 'Unshipped'
    ) || [];

    console.log(`✅ ${filteredOrders.length} órdenes obtenidas`);
    
    // If there's a next token, recursively get more orders
    if (data.payload?.NextToken) {
      console.log('📑 Obteniendo siguiente página de órdenes...');
      const nextPageResult = await getOrders(accessToken, data.payload.NextToken);
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
    console.error('❌ Error obteniendo órdenes:', error);
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

async function checkProductExists(asin: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('amazon_products')
    .select('id')
    .eq('asin', asin)
    .single();

  if (error && error.code !== 'PGRST116') { // PGRST116 is "no rows returned"
    throw error;
  }

  return !!data;
}

async function checkOrderExists(orderId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('amazon_orders')
    .select('id')
    .eq('amazon_order_id', orderId)
    .single();

  if (error && error.code !== 'PGRST116') {
    throw error;
  }

  return !!data;
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

    const startDate = '2023-01-01T00:00:00Z';
    const endDate = new Date().toISOString();

    const accessToken = await getAccessToken();
    const { Orders } = await getOrders(accessToken);

    const results = [];
    const orderItems = [];
    const products = new Set();
    let successCount = 0;
    let errorCount = 0;
    const totalOrders = Orders.length;

    for (const order of Orders) {
      try {
        // Check if order already exists
        const orderExists = await checkOrderExists(order.AmazonOrderId);
        if (orderExists) {
          console.log(`📝 Orden ${order.AmazonOrderId} ya existe, saltando...`);
          continue;
        }

        const items = await getOrderItems(accessToken, order.AmazonOrderId);
        
        orderItems.push({
          orderId: order.AmazonOrderId,
          items: items.OrderItems
        });

        for (const item of items.OrderItems) {
          if (!products.has(item.ASIN)) {
            products.add(item.ASIN);
            
            const exists = await checkProductExists(item.ASIN);
            if (!exists) {
              const { error: productError } = await supabase
                .from('amazon_products')
                .insert({
                  asin: item.ASIN,
                  title: item.Title,
                  updated_at: new Date().toISOString(),
                });

              if (productError) {
                errorCount++;
              } else {
                successCount++;
              }
            }
          }
        }

        const orderAmount = order.OrderTotal?.Amount ? parseFloat(order.OrderTotal.Amount) : 0;

        const { error: orderError } = await supabase.rpc('sync_amazon_order', {
          p_order_id: order.AmazonOrderId,
          p_status: order.OrderStatus,
          p_amount: orderAmount
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

    const syncStatus = errorCount === 0 ? 'success' : 'partial';
    
    await saveSyncHistory(
      startDate,
      endDate,
      totalOrders,
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
          totalOrders,
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