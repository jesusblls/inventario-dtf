import { createClient } from 'npm:@supabase/supabase-js@2.39.7';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

interface AlertEmail {
  to: string;
  subject: string;
  alerts: {
    type: 'low_stock' | 'high_demand';
    productName: string;
    currentValue: number;
    threshold: number;
  }[];
}

Deno.serve(async (req) => {
  try {
    if (req.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    // Validate request method
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get request data
    const { to, subject, alerts }: AlertEmail = await req.json();

    // Validate required fields
    if (!to || !subject || !alerts || !alerts.length) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create email content
    const htmlContent = `
      <h2>Alertas de Inventario</h2>
      <p>Se han detectado las siguientes alertas:</p>
      ${alerts.map(alert => `
        <div style="margin-bottom: 20px; padding: 15px; border-left: 4px solid ${alert.type === 'low_stock' ? '#f59e0b' : '#3b82f6'}; background-color: #f3f4f6;">
          <h3 style="margin: 0 0 10px 0; color: ${alert.type === 'low_stock' ? '#92400e' : '#1e40af'};">
            ${alert.type === 'low_stock' ? '⚠️ Stock Bajo' : '📈 Alta Demanda'}
          </h3>
          <p style="margin: 0;"><strong>Producto:</strong> ${alert.productName}</p>
          <p style="margin: 5px 0;">
            <strong>${alert.type === 'low_stock' ? 'Stock Actual' : 'Ventas'}:</strong> 
            ${alert.currentValue}
          </p>
          <p style="margin: 0;">
            <strong>Umbral:</strong> 
            ${alert.threshold} ${alert.type === 'low_stock' ? 'unidades' : 'ventas'}
          </p>
        </div>
      `).join('')}
      <p style="color: #4b5563; font-size: 0.875rem;">
        Este es un mensaje automático, por favor no responder.
      </p>
    `;

    // Send email using Resend
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    if (!resendApiKey) {
      throw new Error('RESEND_API_KEY is not defined');
    }

    const emailResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'DTF Manager <alerts@dtfmanager.com>',
        to,
        subject,
        html: htmlContent,
      }),
    });

    if (!emailResponse.ok) {
      const error = await emailResponse.text();
      throw new Error(`Failed to send email: ${error}`);
    }

    return new Response(
      JSON.stringify({ success: true, message: 'Email sent successfully' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error sending email:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});