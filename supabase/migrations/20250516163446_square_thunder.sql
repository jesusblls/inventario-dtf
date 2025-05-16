-- Function to get check history
CREATE OR REPLACE FUNCTION get_check_history(
  p_limit integer DEFAULT 10
)
RETURNS TABLE (
  check_time timestamptz,
  check_status text,
  items_processed integer,
  error_message text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    started_at as check_time,
    status as check_status,
    items_processed,
    error_message
  FROM automated_checks
  WHERE type = 'alerts'
  ORDER BY started_at DESC
  LIMIT p_limit;
END;
$$;