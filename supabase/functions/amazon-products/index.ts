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

async function getOrderItems(accessToken: string, orderId: string) {
  try {
    const headers = {
      'x-amz-access-token': accessToken,
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    };

    const apiUrl = `https://sellingpartnerapi-na.amazon.com/orders/v0/orders/${orderId}/orderItems`;
    console.log('Fetching order items from:', apiUrl);

    const response = await fetch(apiUrl, { 
      method: 'GET',
      headers 
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Amazon order items response:', errorText);
      throw new Error(`Failed to get order items: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const data = await response.json();
    console.log('Order Items API response:', data);

    // Extract products from order items
    const items = data.OrderItems?.map(item => ({
      asin: item.ASIN,
      title: item.Title,
      quantity: item.QuantityOrdered
    })) || [];

    return {
      items,
      payload: data
    };
  } catch (error) {
    console.error('Error getting order items:', error);
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

    try {
      await validateEnvironment();
    } catch (error) {
      return new Response(
        JSON.stringify({
          success: false,
          error: error.message
        }),
        { 
          status: 500, 
          headers: corsHeaders 
        }
      );
    }

    // Get order ID from request body
    const body = await req.json();
    const orderId = body.orderId;

    if (!orderId) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Order ID is required'
        }),
        { 
          status: 400, 
          headers: corsHeaders 
        }
      );
    }

    const accessToken = await getAccessToken();
    const { items, payload } = await getOrderItems(accessToken, orderId);

    const results = [];
    if (items && Array.isArray(items)) {
      for (const item of items) {
        try {
          if (!item.asin) {
            console.warn('Item missing ASIN:', item);
            continue;
          }

          const { error, data } = await supabase
            .from('amazon_products')
            .upsert({
              asin: item.asin,
              title: item.title || 'Unknown Title',
              updated_at: new Date().toISOString(),
            }, {
              onConflict: 'asin',
            });

          if (error) {
            console.error('Error upserting item:', error);
            results.push({ asin: item.asin, error: error.message });
          } else {
            results.push({ asin: item.asin, success: true });
          }
        } catch (error) {
          console.error('Error processing item:', error);
          results.push({ 
            asin: item.asin, 
            error: `Failed to process item: ${error.message}` 
          });
        }
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        items: items || [], 
        results,
        payload,
        timestamp: new Date().toISOString()
      }), 
      { headers: corsHeaders }
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
        headers: corsHeaders 
      }
    );
  }
});