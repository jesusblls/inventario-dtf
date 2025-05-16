/*
  # Add email notifications for alerts

  1. Changes
    - Add notify_email column to alert_settings
    - Add function to send alert notifications
    - Add function to run automated checks
    - Add function to trigger checks with rate limiting
*/

-- Add notify_email to alert_settings if it doesn't exist
ALTER TABLE alert_settings 
ADD COLUMN IF NOT EXISTS notify_email text;

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

  -- If there are alerts to send, call the edge function
  IF jsonb_array_length(alerts_array) > 0 THEN
    PERFORM pg_notify(
      'send_alert_email',
      json_build_object(
        'to', notify_email,
        'subject', 'Nuevas Alertas de Inventario',
        'alerts', alerts_array
      )::text
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

-- Drop existing function before recreating
DROP FUNCTION IF EXISTS trigger_automated_checks();

-- Create function that will be called by the scheduler
CREATE FUNCTION trigger_automated_checks()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only run if no check has run in the last 5 minutes
  IF NOT EXISTS (
    SELECT 1 
    FROM automated_checks
    WHERE started_at >= now() - interval '5 minutes'
    AND type = 'alerts'
  ) THEN
    PERFORM run_automated_checks();
  END IF;
END;
$$;