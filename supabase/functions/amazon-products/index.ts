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
        refresh_token: Deno.env.get('REFRESH_TOKEN')!,
        client_id: Deno.env.get('CLIENT_ID')!,
        client_secret: Deno.env.get('CLIENT_SECRET')!,
      }),
    });

    const data = await response.json();
    return data.access_token;
  } catch (error) {
    console.error('Error getting access token:', error);
    throw error;
  }
}

async function getCatalogItems(accessToken: string) {
  try {
    const headers = {
      'x-amz-access-token': accessToken,
    };

    const params = new URLSearchParams({
      MarketplaceId: Deno.env.get('MARKETPLACE_ID')!,
      IncludeIdentifiers: 'true',
      PageSize: '20',
    });

    const response = await fetch(
      `https://sellingpartnerapi-${Deno.env.get('REGION')?.toLowerCase()}.amazon.com/catalog/2022-04-01/items?${params}`,
      { headers }
    );

    return await response.json();
  } catch (error) {
    console.error('Error getting catalog items:', error);
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
          'Access-Control-Allow-Methods': 'GET',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
      });
    }

    // Only allow GET requests
    if (req.method !== 'GET') {
      return new Response('Method not allowed', { status: 405 });
    }

    // Get Amazon access token
    const accessToken = await getAccessToken();

    // Get catalog items from Amazon
    const catalogItems = await getCatalogItems(accessToken);

    // Store items in Supabase
    if (catalogItems.items) {
      for (const item of catalogItems.items) {
        const { error } = await supabase
          .from('amazon_products')
          .upsert({
            asin: item.asin,
            title: item.summaries[0]?.titleValue || 'Unknown Title',
            updated_at: new Date().toISOString(),
          }, {
            onConflict: 'asin',
          });

        if (error) {
          console.error('Error upserting item:', error);
        }
      }
    }

    return new Response(JSON.stringify({ success: true, items: catalogItems.items }), {
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