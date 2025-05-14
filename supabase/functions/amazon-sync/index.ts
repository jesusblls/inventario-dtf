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
  console.log('🔍 Validando variables de entorno...');
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
    console.error('❌ Variables de entorno faltantes:', missingVars.join(', '));
    throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
  }
  console.log('✅ Variables de entorno validadas');
}

async function getAccessToken() {
  try {
    console.log('🔑 Obteniendo token de acceso...');
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
      console.error('❌ Error en respuesta de token:', errorText);
      throw new Error(`Failed to get access token: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    if (!data.access_token) {
      console.error('❌ Token no encontrado en la respuesta');
      throw new Error('Access token not found in response');
    }

    console.log('✅ Token de acceso obtenido');
    return data.access_token;
  } catch (error) {
    console.error('❌ Error obteniendo token:', error);
    throw new Error(`Authentication failed: ${error.message}`);
  }
}

async function getOrders(accessToken: string, createdAfter: string) {
  try {
    console.log('📦 Obteniendo órdenes desde:', createdAfter);
    const marketplaceId = Deno.env.get('AMAZON_MARKETPLACE_ID');
    
    const headers = {
      'x-amz-access-token': accessToken,
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    };

    const params = new URLSearchParams({
      MarketplaceIds: marketplaceId!,
      CreatedAfter: createdAfter,
      MaxResultsPerPage: '100',
      OrderStatuses: 'Shipped,Unshipped'
    });

    const apiUrl = `https://sellingpartnerapi-na.amazon.com/orders/v0/orders?${params}`;
    console.log('🔍 URL de la API:', apiUrl);

    const response = await fetch(apiUrl, { headers });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Error en respuesta de órdenes:', errorText);
      throw new Error(`Failed to get orders: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const filteredOrders = data.Orders?.filter(order => 
      order.OrderStatus === 'Shipped' || 
      order.OrderStatus === 'Unshipped'
    ) || [];

    console.log(`✅ ${filteredOrders.length} órdenes obtenidas`);
    return {
      Orders: filteredOrders,
      payload: data
    };
  } catch (error) {
    console.error('❌ Error obteniendo órdenes:', error);
    throw new Error(`Orders fetch failed: ${error.message}`);
  }
}

async function getOrderItems(accessToken: string, orderId: string) {
  try {
    console.log(`📝 Obteniendo items de la orden ${orderId}...`);
    const headers = {
      'x-amz-access-token': accessToken,
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    };

    const apiUrl = `https://sellingpartnerapi-na.amazon.com/orders/v0/orders/${orderId}/orderItems`;
    console.log('🔍 URL de la API:', apiUrl);

    const response = await fetch(apiUrl, { headers });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Error en respuesta de items:', errorText);
      throw new Error(`Failed to get order items: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    console.log(`✅ ${data.payload.OrderItems.length} items obtenidos para la orden ${orderId}`);
    return data.payload;
  } catch (error) {
    console.error('❌ Error obteniendo items de la orden:', error);
    throw new Error(`Order items fetch failed: ${error.message}`);
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

    console.log('🚀 Iniciando sincronización...');
    await validateEnvironment();

    let body;
    try {
      body = await req.json();
    } catch (error) {
      console.error('❌ Error en el body de la petición:', error);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Invalid JSON in request body' 
        }), 
        { 
          status: 400, 
          headers: corsHeaders 
        }
      );
    }

    const start_date = body.start_date || '2023-01-01T00:00:00Z';
    console.log('📅 Fecha de inicio:', start_date);

    const accessToken = await getAccessToken();
    const { Orders } = await getOrders(accessToken, start_date);

    console.log(`🔄 Procesando ${Orders.length} órdenes...`);

    const results = [];
    const orderItems = [];
    const products = new Set();

    for (const order of Orders) {
      console.log(`\n📦 Procesando orden: ${order.AmazonOrderId}`);
      console.log('Estado:', order.OrderStatus);
      console.log('Fecha de creación:', order.PurchaseDate);
      
      try {
        // Get order items
        const items = await getOrderItems(accessToken, order.AmazonOrderId);
        
        // Store order items for response
        orderItems.push({
          orderId: order.AmazonOrderId,
          items: items.OrderItems
        });

        // Process each item in the order
        console.log(`\n📝 Procesando ${items.OrderItems.length} items de la orden...`);
        for (const item of items.OrderItems) {
          console.log(`\n🏷️ Producto: ${item.Title}`);
          console.log('ASIN:', item.ASIN);
          console.log('Cantidad:', item.QuantityOrdered);
          console.log('SKU:', item.SellerSKU);

          // Save product if we haven't seen it before
          if (!products.has(item.ASIN)) {
            console.log('💾 Guardando nuevo producto en la base de datos...');
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
              console.error('❌ Error guardando producto:', productError);
            } else {
              console.log('✅ Producto guardado correctamente');
            }
          } else {
            console.log('ℹ️ Producto ya existente en la base de datos');
          }
        }

        // Save the order
        console.log('💾 Guardando orden en la base de datos...');
        const { error: orderError } = await supabase.rpc('sync_amazon_order', {
          p_order_id: order.AmazonOrderId,
          p_status: order.OrderStatus
        });

        if (orderError) {
          console.error('❌ Error guardando orden:', orderError);
          results.push({ 
            orderId: order.AmazonOrderId, 
            error: orderError.message 
          });
        } else {
          console.log('✅ Orden guardada correctamente');
          results.push({ 
            orderId: order.AmazonOrderId, 
            success: true 
          });
        }
      } catch (error) {
        console.error('❌ Error procesando orden:', error);
        results.push({ 
          orderId: order.AmazonOrderId, 
          error: `Failed to process order: ${error.message}` 
        });
      }
    }

    console.log('\n🎉 Sincronización completada');
    console.log(`📊 Resumen:
- Órdenes procesadas: ${Orders.length}
- Productos únicos: ${products.size}
- Éxitos: ${results.filter(r => r.success).length}
- Errores: ${results.filter(r => !r.success).length}
`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        orders: Orders, 
        orderItems,
        products: Array.from(products),
        results,
        timestamp: new Date().toISOString()
      }), 
      { headers: corsHeaders }
    );
  } catch (error) {
    console.error('❌ Error general:', error);
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