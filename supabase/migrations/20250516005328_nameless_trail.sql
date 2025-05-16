/*
  # Fix alert tables and policies

  1. Changes
    - Add IF NOT EXISTS checks for table creation
    - Add IF NOT EXISTS for policies
    - Ensure RLS is enabled
    - Add check_and_create_alerts function
*/

-- Create alert_settings table if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT FROM pg_tables 
    WHERE schemaname = 'public' 
    AND tablename = 'alert_settings'
  ) THEN
    CREATE TABLE alert_settings (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      type text NOT NULL CHECK (type IN ('low_stock', 'high_demand')),
      threshold integer NOT NULL,
      created_at timestamptz DEFAULT now(),
      updated_at timestamptz DEFAULT now()
    );
  END IF;
END $$;

-- Create alerts table if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT FROM pg_tables 
    WHERE schemaname = 'public' 
    AND tablename = 'alerts'
  ) THEN
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
  END IF;
END $$;

-- Enable RLS
ALTER TABLE alert_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;

-- Add RLS policies if they don't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'alert_settings' 
    AND policyname = 'Allow read for authenticated users'
  ) THEN
    CREATE POLICY "Allow read for authenticated users"
      ON alert_settings
      FOR SELECT
      TO authenticated
      USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'alert_settings' 
    AND policyname = 'Allow update for authenticated users'
  ) THEN
    CREATE POLICY "Allow update for authenticated users"
      ON alert_settings
      FOR UPDATE
      TO authenticated
      USING (true)
      WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'alerts' 
    AND policyname = 'Allow read for authenticated users'
  ) THEN
    CREATE POLICY "Allow read for authenticated users"
      ON alerts
      FOR SELECT
      TO authenticated
      USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'alerts' 
    AND policyname = 'Allow update for authenticated users'
  ) THEN
    CREATE POLICY "Allow update for authenticated users"
      ON alerts
      FOR UPDATE
      TO authenticated
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;

-- Drop and recreate function
DROP FUNCTION IF EXISTS check_and_create_alerts();

CREATE OR REPLACE FUNCTION check_and_create_alerts()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  -- Check for low stock alerts
  INSERT INTO alerts (product_id, type, threshold, current_value, status)
  SELECT 
    p.id,
    'low_stock',
    s.threshold,
    p.stock,
    'pending'
  FROM products p
  CROSS JOIN (
    SELECT threshold 
    FROM alert_settings 
    WHERE type = 'low_stock' 
    LIMIT 1
  ) s
  WHERE p.stock < s.threshold
  AND NOT EXISTS (
    SELECT 1 
    FROM alerts a 
    WHERE a.product_id = p.id 
    AND a.type = 'low_stock'
    AND a.status = 'pending'
  );

  -- Check for high demand alerts
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
    s.threshold,
    ms.sales_count,
    'pending'
  FROM monthly_sales ms
  CROSS JOIN (
    SELECT threshold 
    FROM alert_settings 
    WHERE type = 'high_demand' 
    LIMIT 1
  ) s
  WHERE ms.sales_count >= s.threshold
  AND NOT EXISTS (
    SELECT 1 
    FROM alerts a 
    WHERE a.product_id = ms.product_id 
    AND a.type = 'high_demand'
    AND a.status = 'pending'
  );
END;
$$;