/*
  # Add Amazon Orders Table and Functions

  1. New Tables
    - `amazon_orders`
      - `id` (uuid, primary key)
      - `amazon_order_id` (text, unique)
      - `status` (text)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on `amazon_orders` table
    - Add policy for authenticated users to read orders
*/

-- Create amazon_orders table
CREATE TABLE IF NOT EXISTS amazon_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  amazon_order_id text UNIQUE NOT NULL,
  status text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE amazon_orders ENABLE ROW LEVEL SECURITY;

-- Add RLS policies
CREATE POLICY "Allow read for authenticated users"
  ON amazon_orders
  FOR SELECT
  TO authenticated
  USING (true);

-- Function to sync Amazon orders
CREATE OR REPLACE FUNCTION sync_amazon_order(
  p_order_id text,
  p_status text
)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO amazon_orders (amazon_order_id, status)
  VALUES (p_order_id, p_status)
  ON CONFLICT (amazon_order_id) 
  DO UPDATE SET 
    status = EXCLUDED.status,
    updated_at = now();
END;
$$;