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
      MaxResultsPerPage: '50',
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
      // Instead of recursively fetching, just return the current batch and the next token
      return {
        Orders: filteredOrders,
        nextToken: data.payload.NextToken
      };
    }

    return {
      Orders: filteredOrders,
      nextToken: null
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
      signal: AbortSignal.timeout(15000)
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
    // Process orders in chunks of 25
    const chunkSize = 25;
    for (let i = 0; i < orders.length; i += chunkSize) {
      const chunk = orders.slice(i, i + chunkSize);
      const ordersToSave = chunk.map(order => ({
        amazon_order_id: order.AmazonOrderId,
        status: order.OrderStatus,
        amount: order.OrderTotal?.Amount ? parseFloat(order.OrderTotal.Amount) : 0,
        purchase_date: order.PurchaseDate || new Date().toISOString(),
        last_sync_date: new Date().toISOString()
      }));

      const { error } = await supabase
        .from('amazon_orders')
        .insert(ordersToSave);

      if (error) throw error;

      console.log(`✅ Saved chunk of ${ordersToSave.length} orders`);
      
      // Add a small delay between chunks to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  } catch (error) {
    console.error('❌ Error saving orders in bulk:', error);
    throw error;
  }
}

async function saveOrderItems(orderId: string, items: any[]) {
  try {
    // Process items in chunks of 25
    const chunkSize = 25;
    const chunks = [];
    for (let i = 0; i < items.length; i += chunkSize) {
      chunks.push(items.slice(i, i + chunkSize));
    }

    for (const chunk of chunks) {
      const orderItems = chunk.map(item => ({
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

      // Add a small delay between chunks
      await new Promise(resolve => setTimeout(resolve, 1000));
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

    console.log('🔑 Getting access token...');
    const accessToken = await getAccessToken();
    console.log('✅ Access token obtained');

    let nextToken = null;
    let totalProcessed = 0;
    let totalSuccess = 0;
    let totalErrors = 0;
    const batchResults = [];

    do {
      console.log(`📦 Fetching batch of orders${nextToken ? ' with token' : ''}...`);
      const { Orders, nextToken: newToken } = await getOrders(accessToken, nextToken);
      nextToken = newToken;

      console.log(`✅ Retrieved ${Orders.length} orders in this batch`);

      // Filter out existing orders
      const newOrders = [];
      for (const order of Orders) {
        const exists = await checkOrderExists(order.AmazonOrderId);
        if (!exists) {
          newOrders.push(order);
        }
      }

      console.log(`📝 Found ${newOrders.length} new orders to process in this batch`);

      if (newOrders.length > 0) {
        await saveOrdersBulk(newOrders);
        
        let batchSuccess = 0;
        let batchErrors = 0;

        // Process items for each order in this batch
        for (const order of newOrders) {
          try {
            const items = await getOrderItems(accessToken, order.AmazonOrderId);
            await saveOrderItems(order.AmazonOrderId, items.OrderItems);
            
            // Process new products
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
                  batchErrors++;
                } else {
                  console.log(`✅ New product ${item.ASIN} saved`);
                  batchSuccess++;
                }
              }
            }

            batchSuccess++;
          } catch (error) {
            console.error(`❌ Error processing order ${order.AmazonOrderId}:`, error);
            batchErrors++;
          }
        }

        totalProcessed += newOrders.length;
        totalSuccess += batchSuccess;
        totalErrors += batchErrors;

        batchResults.push({
          ordersProcessed: newOrders.length,
          successCount: batchSuccess,
          errorCount: batchErrors
        });

        // Add a delay between batches to avoid rate limiting
        if (nextToken) {
          console.log('⏳ Waiting before processing next batch...');
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }
    } while (nextToken);

    const syncStatus = totalErrors === 0 ? 'success' : 'partial';
    
    await saveSyncHistory(
      new Date().toISOString(),
      new Date().toISOString(),
      totalProcessed,
      syncStatus,
      totalErrors > 0 ? `${totalErrors} errors occurred during sync` : undefined
    );

    console.log('✅ Sync process completed');
    console.log(`📊 Final Summary: ${totalSuccess} successful, ${totalErrors} errors`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        batchResults,
        summary: {
          totalProcessed,
          totalSuccess,
          totalErrors,
          batchCount: batchResults.length
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