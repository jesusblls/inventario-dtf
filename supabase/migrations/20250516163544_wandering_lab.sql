-- Drop existing function
DROP FUNCTION IF EXISTS get_check_history(integer);

-- Recreate function with fixed column references
CREATE OR REPLACE FUNCTION get_check_history(
  p_limit integer DEFAULT 10
)
RETURNS TABLE (
  check_time timestamptz,
  check_status text,
  processed_items integer,
  error_message text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ac.started_at as check_time,
    ac.status as check_status,
    ac.items_processed as processed_items,
    ac.error_message
  FROM automated_checks ac
  WHERE ac.type = 'alerts'
  ORDER BY ac.started_at DESC
  LIMIT p_limit;
END;
$$;