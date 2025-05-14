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
    console.log('📦 Obteniendo órdenes desde:', createdAfter);
    if (nextToken) {
      console.log('🔄 Usando NextToken:', nextToken);
    }

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
    console.log('🔍 URL de la API:', apiUrl);

    const response = await fetch(apiUrl, { headers });

    if (!response.ok) {
      console.error('❌ Error en respuesta de órdenes:', response.status, response.statusText);
      throw new Error(`Failed to get orders: ${response.status} ${response.statusText}`);
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
      // Add delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 2000));
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
    console.error('❌ Error obteniendo órdenes:', error);
    // Add delay before retrying
    await new Promise(resolve => setTimeout(resolve, 5000));
    console.log('🔄 Reintentando obtener órdenes...');
    return getOrders(accessToken, createdAfter, nextToken);
  }
}

async function getOrderItems(accessToken: string, orderId: string, retryCount = 0): Promise<any[]> {
  try {
    const headers = {
      'x-amz-access-token': accessToken,
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    };

    const apiUrl = `https://sellingpartnerapi-na.amazon.com/orders/v0/orders/${orderId}/orderItems`;
    console.log('🔍 Obteniendo items para orden:', orderId);

    const response = await fetch(apiUrl, { headers });

    if (!response.ok) {
      if (retryCount < 3) {
        console.log(`⚠️ Error al obtener items (intento ${retryCount + 1}/3), reintentando en 5 segundos...`);
        await new Promise(resolve => setTimeout(resolve, 5000));
        return getOrderItems(accessToken, orderId, retryCount + 1);
      }
      throw new Error(`Failed to get order items: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    console.log('📦 Items de la orden:', JSON.stringify(data.payload?.OrderItems || [], null, 2));
    return data.payload?.OrderItems || [];
  } catch (error) {
    console.error(`❌ Error obteniendo items para orden ${orderId}:`, error);
    if (retryCount < 3) {
      console.log(`⚠️ Reintentando obtener items (intento ${retryCount + 1}/3)...`);
      await new Promise(resolve => setTimeout(resolve, 5000));
      return getOrderItems(accessToken, orderId, retryCount + 1);
    }
    return [];
  }
}

async function saveSyncHistory(
  startDate: string,
  endDate: string,
  itemsProcessed: number,
  status: string,
  errorMessage?: string
) {
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

async function syncProduct(item: any, retryCount = 0) {
  try {
    console.log('🔄 Sincronizando producto:', item.ASIN);
    
    // Check if product exists
    const { data: existingProduct, error: checkError } = await supabase
      .from('amazon_products')
      .select('id')
      .eq('asin', item.ASIN)
      .single();

    if (checkError && checkError.code !== 'PGRST116') {
      throw checkError;
    }

    if (!existingProduct) {
      console.log('➕ Creando nuevo producto:', item.ASIN);
      // Create new product
      const { error: insertError } = await supabase
        .from('amazon_products')
        .insert({
          asin: item.ASIN,
          title: item.Title,
          updated_at: new Date().toISOString(),
        });

      if (insertError) {
        if (retryCount < 3) {
          console.log(`⚠️ Error al crear producto (intento ${retryCount + 1}/3), reintentando...`);
          await new Promise(resolve => setTimeout(resolve, 2000));
          return syncProduct(item, retryCount + 1);
        }
        throw insertError;
      }
      console.log('✅ Producto creado:', item.ASIN);
    } else {
      console.log('✅ Producto ya existe:', item.ASIN);
    }

    return true;
  } catch (error) {
    console.error('❌ Error sincronizando producto:', item.ASIN, error);
    if (retryCount < 3) {
      console.log(`⚠️ Reintentando sincronizar producto (intento ${retryCount + 1}/3)...`);
      await new Promise(resolve => setTimeout(resolve, 2000));
      return syncProduct(item, retryCount + 1);
    }
    return false;
  }
}

async function syncOrder(accessToken: string, order: any, retryCount = 0) {
  try {
    console.log('🔄 Sincronizando orden:', order.AmazonOrderId);
    
    // Get order items with retry logic
    const items = await getOrderItems(accessToken, order.AmazonOrderId);
    console.log(`📦 ${items.length} items encontrados para orden:`, order.AmazonOrderId);
    
    // Sync products first with delay between each
    let productsProcessed = 0;
    for (const item of items) {
      await new Promise(resolve => setTimeout(resolve, 500)); // Add delay between products
      const success = await syncProduct(item);
      if (success) productsProcessed++;
    }

    // Sync order
    const { error } = await supabase.rpc('sync_amazon_order', {
      p_order_id: order.AmazonOrderId,
      p_status: order.OrderStatus
    });

    if (error) {
      if (retryCount < 3) {
        console.log(`⚠️ Error al sincronizar orden (intento ${retryCount + 1}/3), reintentando...`);
        await new Promise(resolve => setTimeout(resolve, 2000));
        return syncOrder(accessToken, order, retryCount + 1);
      }
      throw error;
    }
    
    console.log('✅ Orden sincronizada:', order.AmazonOrderId);
    return {
      success: true,
      productsProcessed
    };
  } catch (error) {
    console.error('❌ Error sincronizando orden:', order.AmazonOrderId, error);
    if (retryCount < 3) {
      console.log(`⚠️ Reintentando sincronizar orden (intento ${retryCount + 1}/3)...`);
      await new Promise(resolve => setTimeout(resolve, 2000));
      return syncOrder(accessToken, order, retryCount + 1);
    }
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

    console.log('🕒 Última sincronización:', startDate);
    console.log('🕒 Sincronizando hasta:', endDate);

    const accessToken = await getAccessToken();
    const { Orders } = await getOrders(accessToken, startDate);

    console.log(`📦 Total de órdenes a procesar: ${Orders.length}`);

    let successCount = 0;
    let errorCount = 0;
    let totalProductsProcessed = 0;

    // Process orders in smaller batches with delays
    const batchSize = 5;
    for (let i = 0; i < Orders.length; i += batchSize) {
      const batch = Orders.slice(i, i + batchSize);
      console.log(`🔄 Procesando lote ${Math.floor(i/batchSize) + 1} de ${Math.ceil(Orders.length/batchSize)}`);
      
      // Process orders sequentially within batch
      for (const order of batch) {
        const result = await syncOrder(accessToken, order);
        if (result.success) successCount++;
        else errorCount++;
        totalProductsProcessed += result.productsProcessed;
        
        // Add delay between orders
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
      console.log(`✅ Lote completado - Éxitos: ${successCount}, Errores: ${errorCount}, Productos: ${totalProductsProcessed}`);
      
      // Add delay between batches
      if (i + batchSize < Orders.length) {
        console.log('⏳ Esperando antes del siguiente lote...');
        await new Promise(resolve => setTimeout(resolve, 3000));
      }
    }

    const syncStatus = errorCount === 0 ? 'success' : 'partial';
    
    await saveSyncHistory(
      startDate,
      endDate,
      Orders.length,
      syncStatus,
      errorCount > 0 ? `${errorCount} errors occurred during sync` : undefined
    );

    console.log('✅ Sincronización completada');
    console.log(`📊 Resumen:
      - Órdenes totales: ${Orders.length}
      - Órdenes exitosas: ${successCount}
      - Órdenes con error: ${errorCount}
      - Productos procesados: ${totalProductsProcessed}
    `);

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
    console.error('❌ Error en sincronización:', error);

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