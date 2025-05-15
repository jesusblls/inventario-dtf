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

    const tokenUrl = 'https://api.amazon.com/auth/o2/token';
    console.log('🔑 Requesting access token from:', tokenUrl);

    const response = await fetch(tokenUrl, {
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
      console.error('❌ Token request failed:', response.status, errorText);
      throw new Error(`Failed to get access token: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const data = await response.json();
    if (!data.access_token) {
      console.error('❌ No access token in response:', data);
      throw new Error('Access token not found in response');
    }

    console.log('✅ Access token obtained successfully');
    return data.access_token;
  } catch (error) {
    console.error('❌ Authentication error:', error);
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
    if (!marketplaceId) {
      throw new Error('AMAZON_MARKETPLACE_ID is not defined');
    }
    
    const headers = {
      'x-amz-access-token': accessToken,
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    };

    const params = new URLSearchParams({
      MarketplaceIds: marketplaceId.trim(),
      CreatedAfter: createdAfter,
      MaxResultsPerPage: '100',
      OrderStatuses: 'Shipped,Unshipped'
    });

    if (nextToken) {
      params.append('NextToken', nextToken);
    }

    const apiUrl = `https://sellingpartnerapi-na.amazon.com/orders/v0/orders?${params}`;
    console.log('🔍 URL de la API:', apiUrl);

    const response = await fetch(apiUrl, { 
      headers,
      signal: AbortSignal.timeout(30000)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Error en respuesta de órdenes:', errorText);
      throw new Error(`Failed to get orders: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const data = await response.json();
    console.log('📦 Respuesta de órdenes:', JSON.stringify(data, null, 2));

    if (!data.payload) {
      console.error('❌ Invalid response format:', data);
      throw new Error('Invalid response format from Amazon API');
    }

    const filteredOrders = data.payload?.Orders?.filter(order => 
      order.OrderStatus === 'Shipped' || 
      order.OrderStatus === 'Unshipped'
    ) || [];

    console.log(`✅ ${filteredOrders.length} órdenes obtenidas`);
    
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
    console.log('🔍 Obteniendo items para orden:', orderId);

    const response = await fetch(apiUrl, { 
      headers,
      signal: AbortSignal.timeout(30000)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ Error obteniendo items para orden ${orderId}:`, errorText);
      throw new Error(`Failed to get order items: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const data = await response.json();
    if (!data.payload) {
      throw new Error('Invalid response format from Amazon API');
    }

    console.log(`✅ Items obtenidos para orden ${orderId}`);
    return data.payload;
  } catch (error) {
    console.error(`❌ Error obteniendo items para orden ${orderId}:`, error);
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
    console.error('❌ Error saving sync history:', error);
  }
}

async function checkProductExists(asin: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('amazon_products')
    .select('id')
    .eq('asin', asin)
    .single();

  if (error && error.code !== 'PGRST116') {
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

async function saveOrdersBulk(orders: any[]) {
  try {
    const ordersToSave = orders.map(order => ({
      amazon_order_id: order.AmazonOrderId,
      status: order.OrderStatus,
      amount: order.OrderTotal?.Amount ? parseFloat(order.OrderTotal.Amount) : 0,
      last_sync_date: new Date().toISOString()
    }));

    const { error } = await supabase
      .from('amazon_orders')
      .insert(ordersToSave);

    if (error) throw error;

    console.log(`✅ Saved ${ordersToSave.length} orders in bulk`);
  } catch (error) {
    console.error('❌ Error saving orders in bulk:', error);
    throw error;
  }
}

async function saveOrderItems(orderId: string, items: any[]) {
  try {
    const orderItems = items.map(item => ({
      amazon_order_id: orderId,
      asin: item.ASIN,
      quantity_ordered: parseInt(item.QuantityOrdered || '1', 10)
    }));

    const { error } = await supabase
      .from('amazon_order_items')
      .insert(orderItems);

    if (error) throw error;

    // Update inventory for related products and designs
    for (const item of orderItems) {
      await updateInventory(item.asin, item.quantity_ordered);
    }
  } catch (error) {
    console.error('Error saving order items:', error);
    throw error;
  }
}

async function updateInventory(asin: string, quantity: number) {
  try {
    // Get product relationships
    const { data: relationships, error: relError } = await supabase
      .from('product_amazon_products')
      .select(`
        product_id,
        amazon_product_id,
        products (id, stock),
        amazon_products!amazon_product_id (id)
      `)
      .eq('amazon_products.asin', asin);

    if (relError) throw relError;

    // Update product stock
    for (const rel of relationships || []) {
      if (rel.products?.id) {
        const { error: updateError } = await supabase
          .from('products')
          .update({ 
            stock: Math.max(0, (rel.products.stock || 0) - quantity),
            updated_at: new Date().toISOString()
          })
          .eq('id', rel.products.id);

        if (updateError) throw updateError;
      }
    }

    // Get design relationships
    const { data: designRels, error: designRelError } = await supabase
      .from('design_amazon_products')
      .select(`
        design_id,
        amazon_product_id,
        designs (id, stock),
        amazon_products!amazon_product_id (id)
      `)
      .eq('amazon_products.asin', asin);

    if (designRelError) throw designRelError;

    // Update design stock
    for (const rel of designRels || []) {
      if (rel.designs?.id) {
        const { error: updateError } = await supabase
          .from('designs')
          .update({ 
            stock: Math.max(0, (rel.designs.stock || 0) - quantity),
            updated_at: new Date().toISOString()
          })
          .eq('id', rel.designs.id);

        if (updateError) throw updateError;
      }
    }
  } catch (error) {
    console.error('Error updating inventory:', error);
    throw error;
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

    console.log('🚀 Starting Amazon sync process...');
    
    await validateEnvironment();
    console.log('✅ Environment variables validated');

    const startDate = '2023-01-01T00:00:00Z';
    const endDate = new Date().toISOString();

    console.log('🔑 Getting access token...');
    const accessToken = await getAccessToken();
    console.log('✅ Access token obtained');

    console.log('📦 Fetching orders...');
    const { Orders } = await getOrders(accessToken);
    console.log(`✅ Retrieved ${Orders.length} orders`);

    // Filter out existing orders
    const newOrders = [];
    for (const order of Orders) {
      const exists = await checkOrderExists(order.AmazonOrderId);
      if (!exists) {
        newOrders.push(order);
      }
    }

    console.log(`📝 Found ${newOrders.length} new orders to process`);

    // Save all new orders in bulk first
    if (newOrders.length > 0) {
      await saveOrdersBulk(newOrders);
    }

    const results = [];
    let successCount = 0;
    let errorCount = 0;

    // Now process items for each order
    for (const order of newOrders) {
      try {
        console.log(`📝 Processing items for order ${order.AmazonOrderId}...`);
        
        const items = await getOrderItems(accessToken, order.AmazonOrderId);
        await saveOrderItems(order.AmazonOrderId, items.OrderItems);
        console.log(`✅ Items for order ${order.AmazonOrderId} saved`);

        // Save new products if needed
        for (const item of items.OrderItems) {
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
              console.error(`❌ Error saving product ${item.ASIN}:`, productError);
              errorCount++;
            } else {
              console.log(`✅ New product ${item.ASIN} saved`);
              successCount++;
            }
          }
        }

        successCount++;
        results.push({ 
          orderId: order.AmazonOrderId, 
          success: true 
        });
      } catch (error) {
        console.error(`❌ Error processing order ${order.AmazonOrderId}:`, error);
        errorCount++;
        results.push({ 
          orderId: order.AmazonOrderId, 
          error: error.message 
        });
      }
    }

    const syncStatus = errorCount === 0 ? 'success' : 'partial';
    
    await saveSyncHistory(
      startDate,
      endDate,
      newOrders.length,
      syncStatus,
      errorCount > 0 ? `${errorCount} errors occurred during sync` : undefined
    );

    console.log('✅ Sync process completed');
    console.log(`📊 Summary: ${successCount} successful, ${errorCount} errors`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        results,
        summary: {
          startDate,
          endDate,
          totalOrders: newOrders.length,
          successCount,
          errorCount
        },
        timestamp: new Date().toISOString()
      }), 
      { headers: corsHeaders }
    );
  } catch (error) {
    console.error('❌ Fatal error during sync:', error);
    
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