-- Function to start checks manually
CREATE OR REPLACE FUNCTION start_checks()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  was_triggered boolean;
BEGIN
  -- Try to trigger checks
  SELECT trigger_automated_checks() INTO was_triggered;
  
  IF was_triggered THEN
    RETURN jsonb_build_object(
      'success', true,
      'message', 'Checks started successfully'
    );
  ELSE
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Checks not started - last check was too recent'
    );
  END IF;
END;
$$;