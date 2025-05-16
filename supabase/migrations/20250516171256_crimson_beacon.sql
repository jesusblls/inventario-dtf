/*
  # Add email notifications for alerts

  1. Changes
    - Add function to send email notifications for new alerts
    - Update check_and_create_alerts to trigger email notifications
    - Add email settings to alert_settings table
*/

-- Add email column to alert_settings if it doesn't exist
ALTER TABLE alert_settings 
ADD COLUMN IF NOT EXISTS notify_email text;

-- Function to send alert notifications
CREATE OR REPLACE FUNCTION send_alert_notifications(new_alerts jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  notify_email text;
  supabase_url text;
  anon_key text;
BEGIN
  -- Get notification email from settings
  SELECT COALESCE(
    (SELECT notify_email FROM alert_settings WHERE type = 'low_stock' LIMIT 1),
    (SELECT notify_email FROM alert_settings WHERE type = 'high_demand' LIMIT 1)
  ) INTO notify_email;

  -- If no email is configured, exit
  IF notify_email IS NULL THEN
    RETURN;
  END IF;

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
      'alerts', new_alerts
    )
  );
END;
$$;

-- Update check_and_create_alerts to include email notifications
CREATE OR REPLACE FUNCTION check_and_create_alerts()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  low_stock_threshold integer;
  high_demand_threshold integer;
  new_alerts jsonb := '[]'::jsonb;
  alert_record record;
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
  FOR alert_record IN
    SELECT 
      p.id as product_id,
      p.name as product_name,
      p.stock as current_value,
      low_stock_threshold as threshold
    FROM products p
    WHERE p.stock < low_stock_threshold
    AND NOT EXISTS (
      SELECT 1 
      FROM alerts a 
      WHERE a.product_id = p.id 
      AND a.type = 'low_stock'
      AND a.status = 'pending'
    )
  LOOP
    -- Create alert
    INSERT INTO alerts (
      product_id, 
      type, 
      threshold, 
      current_value, 
      status
    ) VALUES (
      alert_record.product_id,
      'low_stock',
      alert_record.threshold,
      alert_record.current_value,
      'pending'
    );

    -- Add to notifications
    new_alerts := new_alerts || jsonb_build_object(
      'type', 'low_stock',
      'productName', alert_record.product_name,
      'currentValue', alert_record.current_value,
      'threshold', alert_record.threshold
    );
  END LOOP;

  -- Check for high demand alerts
  WITH monthly_sales AS (
    SELECT 
      p.id as product_id,
      p.name as product_name,
      COUNT(*) as sales_count
    FROM products p
    JOIN product_amazon_products pap ON p.id = pap.product_id
    JOIN amazon_products ap ON ap.id = pap.amazon_product_id
    JOIN amazon_order_items aoi ON ap.asin = aoi.asin
    JOIN amazon_orders ao ON ao.amazon_order_id = aoi.amazon_order_id
    WHERE ao.created_at >= NOW() - INTERVAL '30 days'
    GROUP BY p.id, p.name
  )
  INSERT INTO alerts (product_id, type, threshold, current_value, status)
  SELECT 
    ms.product_id,
    'high_demand',
    high_demand_threshold,
    ms.sales_count,
    'pending'
  FROM monthly_sales ms
  WHERE ms.sales_count >= high_demand_threshold
  AND NOT EXISTS (
    SELECT 1 
    FROM alerts a 
    WHERE a.product_id = ms.product_id 
    AND a.type = 'high_demand'
    AND a.status = 'pending'
  )
  RETURNING 
    (SELECT name FROM products WHERE id = product_id) as product_name,
    current_value,
    threshold
  INTO alert_record;

  -- Add high demand alerts to notifications
  IF FOUND THEN
    new_alerts := new_alerts || jsonb_build_object(
      'type', 'high_demand',
      'productName', alert_record.product_name,
      'currentValue', alert_record.current_value,
      'threshold', alert_record.threshold
    );
  END IF;

  -- Send notifications if there are new alerts
  IF jsonb_array_length(new_alerts) > 0 THEN
    PERFORM send_alert_notifications(new_alerts);
  END IF;
END;
$$;