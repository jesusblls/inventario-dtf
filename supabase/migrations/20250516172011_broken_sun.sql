/*
  # Add email notifications for alerts

  1. Changes
    - Add notify_email column to alert_settings table
    - Create function to send email notifications
    - Update check_and_create_alerts to include email notifications
*/

-- Add notify_email column to alert_settings if it doesn't exist
ALTER TABLE alert_settings 
ADD COLUMN IF NOT EXISTS notify_email text;

-- Function to send alert notifications
CREATE OR REPLACE FUNCTION send_alert_notifications()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  notify_email text;
  alert_record record;
  alerts_array jsonb := '[]'::jsonb;
  supabase_url text;
  anon_key text;
BEGIN
  -- Get notification email from settings
  SELECT als.notify_email INTO notify_email
  FROM alert_settings als
  WHERE als.notify_email IS NOT NULL
  LIMIT 1;

  -- If no email is configured, exit
  IF notify_email IS NULL THEN
    RETURN;
  END IF;

  -- Get pending alerts with product details
  FOR alert_record IN
    SELECT 
      a.type,
      p.name as product_name,
      a.current_value,
      a.threshold
    FROM alerts a
    JOIN products p ON p.id = a.product_id
    WHERE a.status = 'pending'
  LOOP
    -- Add alert to array
    alerts_array := alerts_array || jsonb_build_object(
      'type', alert_record.type,
      'productName', alert_record.product_name,
      'currentValue', alert_record.current_value,
      'threshold', alert_record.threshold
    );
  END LOOP;

  -- If there are alerts to send
  IF jsonb_array_length(alerts_array) > 0 THEN
    -- Get Supabase connection info
    supabase_url := current_setting('supabase.config.url', true);
    anon_key := current_setting('supabase.config.anon_key', true);

    -- Call edge function to send email
    PERFORM net.http_post(
      url := supabase_url || '/functions/v1/send-alert-email',
      headers := jsonb_build_object(
        'Authorization', 'Bearer ' || anon_key,
        'Content-Type', 'application/json'
      ),
      body := jsonb_build_object(
        'to', notify_email,
        'subject', 'Nuevas Alertas de Inventario',
        'alerts', alerts_array
      )
    );
  END IF;
END;
$$;

-- Update check_and_create_alerts to send notifications
CREATE OR REPLACE FUNCTION check_and_create_alerts()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  low_stock_threshold integer;
  high_demand_threshold integer;
BEGIN
  -- Get thresholds from settings
  SELECT threshold INTO low_stock_threshold
  FROM alert_settings
  WHERE type = 'low_stock'
  LIMIT 1;

  SELECT threshold INTO high_demand_threshold
  FROM alert_settings
  WHERE type = 'high_demand'
  LIMIT 1;

  -- Check for low stock alerts
  INSERT INTO alerts (product_id, type, threshold, current_value, status)
  SELECT 
    p.id,
    'low_stock',
    low_stock_threshold,
    p.stock,
    'pending'
  FROM products p
  WHERE 
    p.stock < low_stock_threshold
    AND NOT EXISTS (
      SELECT 1 
      FROM alerts a 
      WHERE 
        a.product_id = p.id 
        AND a.type = 'low_stock'
        AND a.status = 'pending'
    );

  -- Check for high demand alerts
  WITH daily_orders AS (
    SELECT 
      aoi.asin,
      SUM(aoi.quantity_ordered) as total_ordered
    FROM amazon_order_items aoi
    JOIN amazon_orders ao ON ao.amazon_order_id = aoi.amazon_order_id
    WHERE ao.purchase_date >= NOW() - INTERVAL '24 hours'
    GROUP BY aoi.asin
  )
  INSERT INTO alerts (product_id, type, threshold, current_value, status)
  SELECT DISTINCT
    p.id,
    'high_demand',
    high_demand_threshold,
    COALESCE(daily_ord.total_ordered, 0),
    'pending'
  FROM products p
  JOIN product_amazon_products pap ON pap.product_id = p.id
  JOIN amazon_products ap ON ap.id = pap.amazon_product_id
  CROSS JOIN alert_settings als
  LEFT JOIN daily_orders daily_ord ON daily_ord.asin = ap.asin
  WHERE 
    als.type = 'high_demand'
    AND COALESCE(daily_ord.total_ordered, 0) >= high_demand_threshold
    AND NOT EXISTS (
      SELECT 1 
      FROM alerts a 
      WHERE 
        a.product_id = p.id 
        AND a.type = 'high_demand'
        AND a.status = 'pending'
    );

  -- Send notifications for any new alerts
  PERFORM send_alert_notifications();
END;
$$;