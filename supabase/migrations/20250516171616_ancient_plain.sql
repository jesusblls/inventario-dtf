/*
  # Fix ambiguous notify_email reference

  1. Changes
    - Update the check_and_create_alerts function to properly qualify the notify_email column
    - Ensure all column references are properly qualified with their table names

  2. Security
    - No changes to security policies
*/

CREATE OR REPLACE FUNCTION check_and_create_alerts()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check for low stock alerts
  INSERT INTO alerts (product_id, type, threshold, current_value, status)
  SELECT 
    p.id as product_id,
    'low_stock' as type,
    als.threshold,
    p.stock as current_value,
    'pending' as status
  FROM products p
  CROSS JOIN alert_settings als
  WHERE 
    als.type = 'low_stock'
    AND p.stock <= als.threshold
    AND NOT EXISTS (
      SELECT 1 
      FROM alerts a 
      WHERE 
        a.product_id = p.id 
        AND a.type = 'low_stock'
        AND a.status = 'pending'
    );

  -- Check for high demand alerts
  WITH daily_orders AS (
    SELECT 
      aoi.asin,
      SUM(aoi.quantity_ordered) as total_ordered
    FROM amazon_order_items aoi
    JOIN amazon_orders ao ON ao.amazon_order_id = aoi.amazon_order_id
    WHERE ao.purchase_date >= NOW() - INTERVAL '24 hours'
    GROUP BY aoi.asin
  )
  INSERT INTO alerts (product_id, type, threshold, current_value, status)
  SELECT DISTINCT
    p.id as product_id,
    'high_demand' as type,
    als.threshold,
    COALESCE(do.total_ordered, 0) as current_value,
    'pending' as status
  FROM products p
  JOIN product_amazon_products pap ON pap.product_id = p.id
  JOIN amazon_products ap ON ap.id = pap.amazon_product_id
  CROSS JOIN alert_settings als
  LEFT JOIN daily_orders do ON do.asin = ap.asin
  WHERE 
    als.type = 'high_demand'
    AND COALESCE(do.total_ordered, 0) >= als.threshold
    AND NOT EXISTS (
      SELECT 1 
      FROM alerts a 
      WHERE 
        a.product_id = p.id 
        AND a.type = 'high_demand'
        AND a.status = 'pending'
    );
END;
$$;