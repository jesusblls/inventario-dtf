/*
  # Update sync_amazon_order function to handle order amount

  1. Changes
    - Update sync_amazon_order function to accept amount parameter
    - Add amount parameter to function call
*/

CREATE OR REPLACE FUNCTION sync_amazon_order(
  p_order_id text,
  p_status text,
  p_amount decimal DEFAULT 0
)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO amazon_orders (amazon_order_id, status, amount, last_sync_date)
  VALUES (p_order_id, p_status, p_amount, now())
  ON CONFLICT (amazon_order_id) 
  DO UPDATE SET 
    status = EXCLUDED.status,
    amount = EXCLUDED.amount,
    last_sync_date = now(),
    updated_at = now();
END;
$$;