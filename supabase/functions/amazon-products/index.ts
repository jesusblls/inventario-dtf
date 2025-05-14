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

async function getAccessToken() {
  try {
    const refreshToken = Deno.env.get('AMAZON_REFRESH_TOKEN');
    const clientId = Deno.env.get('AMAZON_CLIENT_ID');
    const clientSecret = Deno.env.get('AMAZON_CLIENT_SECRET');

    if (!refreshToken || !clientId || !clientSecret) {
      throw new Error('Missing required Amazon API credentials');
    }

    const response = await fetch('https://api.amazon.com/auth/o2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        client_id: clientId,
        client_secret: clientSecret,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to get access token: ${errorText}`);
    }

    const data = await response.json();
    return data.access_token;
  } catch (error) {
    console.error('Error getting access token:', error);
    throw error;
  }
}

async function getCatalogItems(accessToken: string) {
  try {
    const marketplaceId = Deno.env.get('AMAZON_MARKETPLACE_ID');
    const region = Deno.env.get('AMAZON_REGION');

    if (!marketplaceId || !region) {
      throw new Error('Missing required Amazon marketplace configuration');
    }

    const headers = {
      'x-amz-access-token': accessToken,
    };

    const params = new URLSearchParams({
      MarketplaceId: marketplaceId,
      IncludeIdentifiers: 'true',
      PageSize: '20',
    });

    const response = await fetch(
      `https://sellingpartnerapi-${region.toLowerCase()}.amazon.com/catalog/2022-04-01/items?${params}`,
      { headers }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to get catalog items: ${errorText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error getting catalog items:', error);
    throw error;
  }
}

Deno.serve(async (req) => {
  try {
    if (req.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    if (req.method !== 'GET') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }), 
        { status: 405, headers: corsHeaders }
      );
    }

    const accessToken = await getAccessToken();
    const catalogItems = await getCatalogItems(accessToken);

    if (catalogItems.items) {
      const results = [];
      for (const item of catalogItems.items) {
        const { error, data } = await supabase
          .from('amazon_products')
          .upsert({
            asin: item.asin,
            title: item.summaries?.[0]?.titleValue || 'Unknown Title',
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
      }

      return new Response(
        JSON.stringify({ success: true, items: catalogItems.items, results }), 
        { headers: corsHeaders }
      );
    }

    return new Response(
      JSON.stringify({ success: true, items: [] }), 
      { headers: corsHeaders }
    );
  } catch (error) {
    console.error('Error processing request:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || 'An unexpected error occurred' 
      }), 
      { status: 500, headers: corsHeaders }
    );
  }
});