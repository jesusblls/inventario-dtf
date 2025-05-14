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
    'AMAZON_REGION',
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
      console.error('Amazon token response:', errorText);
      throw new Error(`Failed to get access token: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    if (!data.access_token) {
      throw new Error('Access token not found in response');
    }

    return data.access_token;
  } catch (error) {
    console.error('Error getting access token:', error);
    throw new Error(`Authentication failed: ${error.message}`);
  }
}

async function getOrders(accessToken: string, createdAfter: string) {
  try {
    const marketplaceId = Deno.env.get('AMAZON_MARKETPLACE_ID');
    const region = Deno.env.get('AMAZON_REGION');
    
    const headers = {
      'x-amz-access-token': accessToken,
      'Content-Type': 'application/json',
    };

    const params = new URLSearchParams({
      MarketplaceIds: marketplaceId!,
      CreatedAfter: createdAfter,
    });

    const apiUrl = `https://sellingpartnerapi-${region}.amazon.com/orders/v0/orders`;
    console.log('Fetching orders from:', apiUrl);

    const response = await fetch(
      `${apiUrl}?${params}`,
      { headers }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Amazon orders response:', errorText);
      throw new Error(`Failed to get orders: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    if (!data.Orders) {
      console.warn('No orders found in response');
      return { Orders: [] };
    }

    return data;
  } catch (error) {
    console.error('Error getting orders:', error);
    throw new Error(`Orders fetch failed: ${error.message}`);
  }
}

Deno.serve(async (req) => {
  // Always include CORS headers in the response
  const responseHeaders = { ...corsHeaders };

  try {
    if (req.method === 'OPTIONS') {
      return new Response(null, { 
        status: 200,
        headers: responseHeaders 
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
          headers: responseHeaders 
        }
      );
    }

    // Validate environment variables first
    await validateEnvironment();

    let body;
    try {
      body = await req.json();
    } catch (error) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Invalid JSON in request body' 
        }), 
        { 
          status: 400, 
          headers: responseHeaders 
        }
      );
    }

    const start_date = body.start_date || new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const accessToken = await getAccessToken();
    const orders = await getOrders(accessToken, start_date);

    const results = [];
    for (const order of orders.Orders || []) {
      for (const item of order.OrderItems || []) {
        try {
          if (!item.ASIN || !item.QuantityOrdered) {
            console.warn('Invalid order item:', item);
            continue;
          }

          const { error } = await supabase.rpc('sync_amazon_order', {
            p_asin: item.ASIN,
            p_quantity: item.QuantityOrdered,
          });

          if (error) {
            console.error('Error syncing order:', error);
            results.push({ 
              orderId: order.AmazonOrderId, 
              asin: item.ASIN, 
              error: error.message 
            });
          } else {
            results.push({ 
              orderId: order.AmazonOrderId, 
              asin: item.ASIN, 
              success: true 
            });
          }
        } catch (error) {
          console.error('Error processing order:', error);
          results.push({ 
            orderId: order.AmazonOrderId, 
            asin: item.ASIN, 
            error: `Failed to process order: ${error.message}` 
          });
        }
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        orders: orders.Orders || [], 
        results,
        timestamp: new Date().toISOString()
      }), 
      { 
        status: 200,
        headers: responseHeaders 
      }
    );
  } catch (error) {
    console.error('Error processing request:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || 'An unexpected error occurred',
        timestamp: new Date().toISOString()
      }), 
      { 
        status: 500, 
        headers: responseHeaders 
      }
    );
  }
});