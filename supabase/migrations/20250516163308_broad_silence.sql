/*
  # Add automated alert check function

  1. Changes
    - Add function to automatically check alerts
    - Add logging table to track automated checks
    - Remove dependency on cron extension
    - Use edge function for scheduling instead
*/

-- Create table to track automated checks
CREATE TABLE IF NOT EXISTS automated_checks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL,
  started_at timestamptz DEFAULT now(),
  completed_at timestamptz,
  items_processed integer DEFAULT 0,
  status text NOT NULL,
  error_message text
);

-- Enable RLS
ALTER TABLE automated_checks ENABLE ROW LEVEL SECURITY;

-- Add RLS policies
CREATE POLICY "Allow read for authenticated users"
  ON automated_checks
  FOR SELECT
  TO authenticated
  USING (true);

-- Function to run automated checks
CREATE OR REPLACE FUNCTION run_automated_checks()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
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

-- Function to trigger automated checks if enough time has passed
CREATE OR REPLACE FUNCTION trigger_automated_checks()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Only run if no check has run in the last 15 minutes
  IF NOT EXISTS (
    SELECT 1 
    FROM automated_checks
    WHERE started_at >= now() - interval '15 minutes'
    AND type = 'alerts'
  ) THEN
    PERFORM run_automated_checks();
    RETURN true;
  END IF;
  RETURN false;
END;
$$;