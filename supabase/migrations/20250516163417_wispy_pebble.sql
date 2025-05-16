/*
  # Update automated check interval

  1. Changes
    - Change interval check from 15 minutes to 3 minutes
    - Update trigger_automated_checks function
*/

-- Update function to use 3 minute interval
CREATE OR REPLACE FUNCTION trigger_automated_checks()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Only run if no check has run in the last 3 minutes
  IF NOT EXISTS (
    SELECT 1 
    FROM automated_checks
    WHERE started_at >= now() - interval '3 minutes'
    AND type = 'alerts'
  ) THEN
    PERFORM run_automated_checks();
    RETURN true;
  END IF;
  RETURN false;
END;
$$;