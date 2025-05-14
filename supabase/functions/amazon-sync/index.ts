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

async function getAccessToken(retryCount = 0) {
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
      throw new Error(`Failed to get access token: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const data = await response.json();
    if (!data.access_token) {
      throw new Error('Access token not found in response');
    }

    return data.access_token;
  } catch (error) {
    if (retryCount < 3) {
      console.log(`Retrying access token fetch (attempt ${retryCount + 1}/3)...`);
      const backoffDelay = Math.pow(2, retryCount) * 1000 + Math.random() * 1000;
      await new Promise(resolve => setTimeout(resolve, backoffDelay));
      return getAccessToken(retryCount + 1);
    }
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
      MaxResultsPerPage: '50', // Reduced from 100 to process smaller batches
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
      console.error('❌ Error en respuesta de órdenes:', response.status, response.statusText, errorText);
      throw new Error(`Failed to get orders: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const data = await response.json();
    console.log('📦 Respuesta de órdenes:', JSON.stringify(data, null, 2));

    const filteredOrders = data.payload?.Orders?.filter(order => 
      order.OrderStatus === 'Shipped' || 
      order.OrderStatus === 'Unshipped'
    ) || [];

    console.log(`✅ ${filteredOrders.length} órdenes obtenidas`);
    
    return {
      Orders: filteredOrders,
      payload: data.payload,
      nextToken: data.payload?.NextToken
    };
  } catch (error) {
    console.error('❌ Error obteniendo órdenes:', error);
    const backoffDelay = Math.floor(Math.random() * 3000) + 2000; // Random delay between 2-5 seconds
    await new Promise(resolve => setTimeout(resolve, backoffDelay));
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
      const errorText = await response.text();
      throw new Error(`Failed to get order items: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const data = await response.json();
    console.log('📦 Items de la orden:', JSON.stringify(data.payload?.OrderItems || [], null, 2));
    return data.payload?.OrderItems || [];
  } catch (error) {
    console.error(`❌ Error obteniendo items para orden ${orderId}:`, error);
    if (retryCount < 3) {
      const backoffDelay = Math.pow(2, retryCount) * 1000 + Math.random() * 1000;
      console.log(`⚠️ Reintentando obtener items (intento ${retryCount + 1}/3) en ${Math.round(backoffDelay)}ms...`);
      await new Promise(resolve => setTimeout(resolve, backoffDelay));
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
      const { error: insertError } = await supabase
        .from('amazon_products')
        .insert({
          asin: item.ASIN,
          title: item.Title,
          updated_at: new Date().toISOString(),
        });

      if (insertError) {
        if (retryCount < 3) {
          const backoffDelay = Math.pow(2, retryCount) * 1000 + Math.random() * 1000;
          console.log(`⚠️ Error al crear producto (intento ${retryCount + 1}/3), reintentando en ${Math.round(backoffDelay)}ms...`);
          await new Promise(resolve => setTimeout(resolve, backoffDelay));
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
      const backoffDelay = Math.pow(2, retryCount) * 1000 + Math.random() * 1000;
      console.log(`⚠️ Reintentando sincronizar producto (intento ${retryCount + 1}/3) en ${Math.round(backoffDelay)}ms...`);
      await new Promise(resolve => setTimeout(resolve, backoffDelay));
      return syncProduct(item, retryCount + 1);
    }
    return false;
  }
}

async function syncOrder(accessToken: string, order: any, retryCount = 0) {
  try {
    console.log('🔄 Sincronizando orden:', order.AmazonOrderId);
    
    const items = await getOrderItems(accessToken, order.AmazonOrderId);
    console.log(`📦 ${items.length} items encontrados para orden:`, order.AmazonOrderId);
    
    let productsProcessed = 0;
    for (const item of items) {
      await new Promise(resolve => setTimeout(resolve, 500));
      const success = await syncProduct(item);
      if (success) productsProcessed++;
    }

    const { error } = await supabase.rpc('sync_amazon_order', {
      p_order_id: order.AmazonOrderId,
      p_status: order.OrderStatus
    });

    if (error) {
      if (retryCount < 3) {
        const backoffDelay = Math.pow(2, retryCount) * 1000 + Math.random() * 1000;
        console.log(`⚠️ Error al sincronizar orden (intento ${retryCount + 1}/3), reintentando en ${Math.round(backoffDelay)}ms...`);
        await new Promise(resolve => setTimeout(resolve, backoffDelay));
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
      const backoffDelay = Math.pow(2, retryCount) * 1000 + Math.random() * 1000;
      console.log(`⚠️ Reintentando sincronizar orden (intento ${retryCount + 1}/3) en ${Math.round(backoffDelay)}ms...`);
      await new Promise(resolve => setTimeout(resolve, backoffDelay));
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
    // Always respond to OPTIONS requests
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

    // Validate environment variables first
    await validateEnvironment();

    const lastSyncDate = await getLastSyncDate();
    const startDate = lastSyncDate;
    const endDate = new Date().toISOString();

    console.log('🕒 Última sincronización:', startDate);
    console.log('🕒 Sincronizando hasta:', endDate);

    const accessToken = await getAccessToken();
    
    let allOrders: any[] = [];
    let nextToken: string | undefined;
    let totalProcessed = 0;
    
    // Process orders in batches
    do {
      const { Orders, nextToken: newNextToken } = await getOrders(accessToken, startDate, nextToken);
      allOrders = [...allOrders, ...Orders];
      nextToken = newNextToken;
      
      // Process this batch of orders
      const batchSize = 5;
      for (let i = 0; i < Orders.length; i += batchSize) {
        const batch = Orders.slice(i, i + batchSize);
        console.log(`🔄 Procesando lote ${Math.floor(i/batchSize) + 1} de ${Math.ceil(Orders.length/batchSize)}`);
        
        for (const order of batch) {
          const result = await syncOrder(accessToken, order);
          if (result.success) totalProcessed++;
          
          // Add delay between orders to prevent rate limiting
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
        
        // Add delay between batches
        if (i + batchSize < Orders.length) {
          console.log('⏳ Esperando antes del siguiente lote...');
          await new Promise(resolve => setTimeout(resolve, 3000));
        }
      }
      
      // If there are more orders, add a delay before fetching the next page
      if (nextToken) {
        console.log('⏳ Esperando antes de obtener la siguiente página...');
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
    } while (nextToken);

    const syncStatus = totalProcessed === allOrders.length ? 'success' : 'partial';
    
    await saveSyncHistory(
      startDate,
      endDate,
      allOrders.length,
      syncStatus,
      totalProcessed < allOrders.length ? `${allOrders.length - totalProcessed} orders failed to sync` : undefined
    );

    console.log('✅ Sincronización completada');
    console.log(`📊 Resumen:
      - Órdenes totales: ${allOrders.length}
      - Órdenes procesadas: ${totalProcessed}
      - Órdenes con error: ${allOrders.length - totalProcessed}
    `);

    return new Response(
      JSON.stringify({ 
        success: true,
        summary: {
          totalOrders: allOrders.length,
          successCount: totalProcessed,
          errorCount: allOrders.length - totalProcessed,
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