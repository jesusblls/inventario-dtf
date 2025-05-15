/*
  # Update alerts handling when thresholds change

  1. Changes
    - Add logic to handle existing alerts when thresholds change
    - Mark alerts as handled if they no longer meet threshold criteria
    
  2. Security
    - Maintain existing RLS policies
*/

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

  -- Update status of existing alerts that no longer meet threshold criteria
  UPDATE alerts
  SET 
    status = 'handled',
    handled_at = now(),
    updated_at = now()
  WHERE status = 'pending'
  AND (
    (type = 'low_stock' AND current_value >= low_stock_threshold)
    OR
    (type = 'high_demand' AND current_value < high_demand_threshold)
  );

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