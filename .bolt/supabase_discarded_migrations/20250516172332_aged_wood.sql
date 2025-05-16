/*
  # Fix automated checks and email notifications

  1. Changes
    - Add cron extension for scheduled checks
    - Add pg_net extension for HTTP requests
    - Update check_and_create_alerts function
    - Add automated check scheduling
*/

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Function to send alert notifications
CREATE OR REPLACE FUNCTION send_alert_notifications()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

-- Function to run automated checks
CREATE OR REPLACE FUNCTION run_automated_checks()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_check_id uuid;
BEGIN
  -- Create check record
  INSERT INTO automated_checks (type, status)
  VALUES ('alerts', 'running')
  RETURNING id INTO v_check_id;

  BEGIN
    -- Run alert checks
    PERFORM check_and_create_alerts();
    
    -- Send notifications
    PERFORM send_alert_notifications();

    -- Update check record as successful
    UPDATE automated_checks
    SET 
      status = 'completed',
      completed_at = now()
    WHERE id = v_check_id;
  EXCEPTION WHEN OTHERS THEN
    -- Update check record with error
    UPDATE automated_checks
    SET 
      status = 'error',
      completed_at = now(),
      error_message = SQLERRM
    WHERE id = v_check_id;
    RAISE;
  END;
END;
$$;

-- Schedule automated checks to run every 5 minutes
SELECT cron.schedule(
  'check-alerts',
  '*/5 * * * *',
  $$SELECT run_automated_checks()$$
);

-- Ensure the schedule is enabled
UPDATE cron.job 
SET active = true 
WHERE jobname = 'check-alerts';