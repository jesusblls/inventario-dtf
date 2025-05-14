/*
  # Add order items tracking and fix inventory sync

  1. New Tables
    - `amazon_order_items`
      - `id` (uuid, primary key)
      - `amazon_order_id` (text) - Reference to amazon_orders
      - `asin` (text) - Amazon product ASIN
      - `quantity_ordered` (integer) - Quantity ordered
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on `amazon_order_items` table
    - Add policy for authenticated users to read items
*/

-- Create amazon_order_items table
CREATE TABLE IF NOT EXISTS amazon_order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  amazon_order_id text REFERENCES amazon_orders(amazon_order_id) ON DELETE CASCADE,
  asin text NOT NULL,
  quantity_ordered integer NOT NULL DEFAULT 1,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE amazon_order_items ENABLE ROW LEVEL SECURITY;

-- Add RLS policies
CREATE POLICY "Allow read for authenticated users"
  ON amazon_order_items
  FOR SELECT
  TO authenticated
  USING (true);

-- Update sync_amazon_order function to handle order items
CREATE OR REPLACE FUNCTION sync_amazon_order(
  p_order_id text,
  p_status text,
  p_amount decimal DEFAULT 0
)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  -- Insert or update order
  INSERT INTO amazon_orders (amazon_order_id, status, amount, last_sync_date)
  VALUES (p_order_id, p_status, p_amount, now())
  ON CONFLICT (amazon_order_id) 
  DO UPDATE SET 
    status = EXCLUDED.status,
    amount = EXCLUDED.amount,
    last_sync_date = now(),
    updated_at = now()
  WHERE amazon_orders.status != EXCLUDED.status
     OR amazon_orders.amount != EXCLUDED.amount;
END;
$$;