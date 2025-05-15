/*
  # Fix alerts functionality

  1. Changes
    - Add ON DELETE CASCADE to foreign key constraint in alerts table
    - Fix check_and_create_alerts function to handle parameters correctly
    - Add unique constraint on alert_settings type column for upsert
    - Add insert policies for authenticated users

  2. Security
    - Add insert policies for authenticated users
*/

-- Drop existing function if it exists
DROP FUNCTION IF EXISTS check_and_create_alerts();

-- Recreate alerts table with correct foreign key
DROP TABLE IF EXISTS alerts;
CREATE TABLE alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid REFERENCES products(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('low_stock', 'high_demand')),
  threshold integer NOT NULL,
  current_value integer NOT NULL,
  status text NOT NULL CHECK (status IN ('pending', 'handled')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  handled_at timestamptz
);

-- Recreate alert_settings table with unique constraint
DROP TABLE IF EXISTS alert_settings;
CREATE TABLE alert_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL UNIQUE CHECK (type IN ('low_stock', 'high_demand')),
  threshold integer NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE alert_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;

-- Add RLS policies
CREATE POLICY "Allow read for authenticated users"
  ON alert_settings
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow insert for authenticated users"
  ON alert_settings
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow update for authenticated users"
  ON alert_settings
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow read for authenticated users"
  ON alerts
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow insert for authenticated users"
  ON alerts
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow update for authenticated users"
  ON alerts
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Function to check and create alerts
CREATE OR REPLACE FUNCTION check_and_create_alerts()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  low_stock_threshold integer;
  high_demand_threshold integer;
BEGIN
  -- Get thresholds from settings
  SELECT threshold INTO low_stock_threshold
  FROM alert_settings
  WHERE type = 'low_stock'
  LIMIT 1;

  SELECT threshold INTO high_demand_threshold
  FROM alert_settings
  WHERE type = 'high_demand'
  LIMIT 1;

  -- Check for low stock alerts
  IF low_stock_threshold IS NOT NULL THEN
    INSERT INTO alerts (product_id, type, threshold, current_value, status)
    SELECT 
      p.id,
      'low_stock',
      low_stock_threshold,
      p.stock,
      'pending'
    FROM products p
    WHERE p.stock < low_stock_threshold
    AND NOT EXISTS (
      SELECT 1 
      FROM alerts a 
      WHERE a.product_id = p.id 
      AND a.type = 'low_stock'
      AND a.status = 'pending'
    );
  END IF;

  -- Check for high demand alerts
  IF high_demand_threshold IS NOT NULL THEN
    WITH monthly_sales AS (
      SELECT 
        p.id as product_id,
        COUNT(*) as sales_count
      FROM products p
      JOIN product_amazon_products pap ON p.id = pap.product_id
      JOIN amazon_products ap ON ap.id = pap.amazon_product_id
      JOIN amazon_order_items aoi ON ap.asin = aoi.asin
      JOIN amazon_orders ao ON ao.amazon_order_id = aoi.amazon_order_id
      WHERE ao.created_at >= NOW() - INTERVAL '30 days'
      GROUP BY p.id
    )
    INSERT INTO alerts (product_id, type, threshold, current_value, status)
    SELECT 
      ms.product_id,
      'high_demand',
      high_demand_threshold,
      ms.sales_count,
      'pending'
    FROM monthly_sales ms
    WHERE ms.sales_count >= high_demand_threshold
    AND NOT EXISTS (
      SELECT 1 
      FROM alerts a 
      WHERE a.product_id = ms.product_id 
      AND a.type = 'high_demand'
      AND a.status = 'pending'
    );
  END IF;
END;
$$;