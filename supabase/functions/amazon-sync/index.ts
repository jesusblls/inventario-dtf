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

async function saveOrder(order: any) {
  try {
    const orderAmount = order.OrderTotal?.Amount ? parseFloat(order.OrderTotal.Amount) : 0;

    const { error } = await supabase
      .from('amazon_orders')
      .insert({
        amazon_order_id: order.AmazonOrderId,
        status: order.OrderStatus,
        amount: orderAmount,
        last_sync_date: new Date().toISOString()
      });

    if (error) throw error;
  } catch (error) {
    console.error('Error saving order:', error);
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

    await validateEnvironment();

    const startDate = '2023-01-01T00:00:00Z';
    const endDate = new Date().toISOString();

    const accessToken = await getAccessToken();
    const { Orders } = await getOrders(accessToken);

    const results = [];
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

        // Save order first
        await saveOrder(order);

        // Then get and save order items
        const items = await getOrderItems(accessToken, order.AmazonOrderId);
        await saveOrderItems(order.AmazonOrderId, items.OrderItems);

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
              errorCount++;
            } else {
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