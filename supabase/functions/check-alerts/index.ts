import { createClient } from 'npm:@supabase/supabase-js@2.39.7';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

Deno.serve(async (req) => {
  try {
    if (req.method === 'OPTIONS') {
      return new Response(null, { status: 200, headers: corsHeaders });
    }

    // Verify the request is authorized
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new Error('Missing or invalid authorization header');
    }

    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Create check record
    const { data: checkRecord, error: checkError } = await supabase
      .from('automated_checks')
      .insert({
        type: 'alerts',
        status: 'running'
      })
      .select()
      .single();

    if (checkError) throw checkError;

    try {
      // Call the check_and_create_alerts function
      const { error: alertError } = await supabase.rpc('check_and_create_alerts');
      
      if (alertError) throw alertError;

      // Update check record as successful
      await supabase
        .from('automated_checks')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString()
        })
        .eq('id', checkRecord.id);

      return new Response(
        JSON.stringify({ success: true, message: 'Alerts checked successfully' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    } catch (error) {
      // Update check record with error
      await supabase
        .from('automated_checks')
        .update({
          status: 'error',
          completed_at: new Date().toISOString(),
          error_message: error.message
        })
        .eq('id', checkRecord.id);

      throw error;
    }
  } catch (error) {
    console.error('Error checking alerts:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});