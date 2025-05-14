import { createClient } from 'npm:@supabase/supabase-js@2.39.7';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function getAccessToken() {
  try {
    const response = await fetch('https://api.amazon.com/auth/o2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: Deno.env.get('AMAZON_REFRESH_TOKEN')!,
        client_id: Deno.env.get('AMAZON_CLIENT_ID')!,
        client_secret: Deno.env.get('AMAZON_CLIENT_SECRET')!,
      }),
    });

    const data = await response.json();
    return data.access_token;
  } catch (error) {
    console.error('Error getting access token:', error);
    throw error;
  }
}

async function getOrders(accessToken: string, createdAfter: string) {
  try {
    const headers = {
      'x-amz-access-token': accessToken,
    };

    const params = new URLSearchParams({
      MarketplaceIds: Deno.env.get('AMAZON_MARKETPLACE_ID')!,
      CreatedAfter: createdAfter,
    });

    const response = await fetch(
      `https://sellingpartnerapi-na.amazon.com/orders/v0/orders?${params}`,
      { headers }
    );

    return await response.json();
  } catch (error) {
    console.error('Error getting orders:', error);
    throw error;
  }
}

Deno.serve(async (req) => {
  try {
    // Handle CORS
    if (req.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
      });
    }

    // Only allow POST requests
    if (req.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 });
    }

    const { start_date = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString() } = await req.json();

    // Get Amazon access token
    const accessToken = await getAccessToken();

    // Get orders from Amazon
    const orders = await getOrders(accessToken, start_date);

    // Process each order
    for (const order of orders.Orders || []) {
      for (const item of order.OrderItems || []) {
        // Sync order with our database
        await supabase.rpc('sync_amazon_order', {
          p_asin: item.ASIN,
          p_quantity: item.QuantityOrdered,
        });
      }
    }

    return new Response(JSON.stringify({ success: true, orders }), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (error) {
    console.error('Error processing request:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  }
});