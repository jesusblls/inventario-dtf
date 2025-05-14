/*
  # Add order amount tracking

  1. Changes
    - Add amount column to amazon_orders table
    - Add total_revenue function to calculate revenue
*/

-- Add amount column to amazon_orders
ALTER TABLE amazon_orders
ADD COLUMN IF NOT EXISTS amount decimal(10,2) DEFAULT 0;

-- Create function to calculate total revenue
CREATE OR REPLACE FUNCTION get_total_revenue(
  start_date timestamptz DEFAULT '-infinity'::timestamptz,
  end_date timestamptz DEFAULT 'infinity'::timestamptz
)
RETURNS decimal
LANGUAGE plpgsql
AS $$
DECLARE
  total decimal;
BEGIN
  SELECT COALESCE(SUM(amount), 0)
  INTO total
  FROM amazon_orders
  WHERE created_at >= start_date
    AND created_at <= end_date;
  
  RETURN total;
END;
$$;