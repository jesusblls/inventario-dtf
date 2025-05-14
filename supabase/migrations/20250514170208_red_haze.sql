/*
  # Update sync_amazon_order function

  1. Changes
    - Add logic to update order status if changed
    - Add last_sync_date column to amazon_orders table
    - Update get_last_sync_date function to use last_sync_date
*/

-- Add last_sync_date column to amazon_orders
ALTER TABLE amazon_orders
ADD COLUMN IF NOT EXISTS last_sync_date timestamptz DEFAULT now();

-- Update sync_amazon_order function
CREATE OR REPLACE FUNCTION sync_amazon_order(
  p_order_id text,
  p_status text
)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO amazon_orders (amazon_order_id, status, last_sync_date)
  VALUES (p_order_id, p_status, now())
  ON CONFLICT (amazon_order_id) 
  DO UPDATE SET 
    status = EXCLUDED.status,
    last_sync_date = now(),
    updated_at = now()
  WHERE amazon_orders.status != EXCLUDED.status;
END;
$$;

-- Update get_last_sync_date function
CREATE OR REPLACE FUNCTION get_last_sync_date()
RETURNS timestamptz
LANGUAGE plpgsql
AS $$
DECLARE
  last_sync timestamptz;
BEGIN
  SELECT last_sync_date 
  INTO last_sync
  FROM amazon_orders
  ORDER BY last_sync_date DESC
  LIMIT 1;
  
  RETURN COALESCE(last_sync, '2023-01-01T00:00:00Z'::timestamptz);
END;
$$;