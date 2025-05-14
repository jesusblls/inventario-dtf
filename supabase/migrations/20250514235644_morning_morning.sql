/*
  # Add functions for dashboard statistics

  1. New Functions
    - get_total_revenue: Calculates total revenue from all orders
    - get_top_products: Gets top selling products with sales metrics

  2. Changes
    - Added revenue calculation function
    - Added top products calculation function with growth metrics
*/

-- Function to get total revenue
CREATE OR REPLACE FUNCTION get_total_revenue()
RETURNS numeric AS $$
BEGIN
  RETURN COALESCE(
    (SELECT SUM(amount)
     FROM amazon_orders
     WHERE status IN ('Shipped', 'Unshipped')),
    0
  );
END;
$$ LANGUAGE plpgsql;

-- Function to get top selling products with revenue and growth
CREATE OR REPLACE FUNCTION get_top_products()
RETURNS TABLE (
  asin text,
  title text,
  total_quantity bigint,
  total_revenue numeric,
  growth numeric
) AS $$
DECLARE
  current_period_start timestamp;
  previous_period_start timestamp;
BEGIN
  -- Set time periods (current = last 30 days, previous = 30 days before that)
  current_period_start := CURRENT_TIMESTAMP - INTERVAL '30 days';
  previous_period_start := current_period_start - INTERVAL '30 days';

  RETURN QUERY
  WITH current_period AS (
    SELECT 
      ap.asin,
      ap.title,
      SUM(aoi.quantity_ordered) as current_quantity,
      SUM(ao.amount * (aoi.quantity_ordered::numeric / (
        SELECT SUM(quantity_ordered) 
        FROM amazon_order_items 
        WHERE amazon_order_id = ao.amazon_order_id
      ))) as current_revenue
    FROM amazon_products ap
    JOIN amazon_order_items aoi ON ap.asin = aoi.asin
    JOIN amazon_orders ao ON aoi.amazon_order_id = ao.amazon_order_id
    WHERE ao.created_at >= current_period_start
    GROUP BY ap.asin, ap.title
  ),
  previous_period AS (
    SELECT 
      ap.asin,
      SUM(aoi.quantity_ordered) as previous_quantity
    FROM amazon_products ap
    JOIN amazon_order_items aoi ON ap.asin = aoi.asin
    JOIN amazon_orders ao ON aoi.amazon_order_id = ao.amazon_order_id
    WHERE ao.created_at >= previous_period_start AND ao.created_at < current_period_start
    GROUP BY ap.asin
  )
  SELECT 
    cp.asin,
    cp.title,
    cp.current_quantity as total_quantity,
    cp.current_revenue as total_revenue,
    CASE 
      WHEN pp.previous_quantity IS NULL OR pp.previous_quantity = 0 THEN 100
      ELSE ROUND(((cp.current_quantity - pp.previous_quantity)::numeric / pp.previous_quantity * 100)::numeric, 2)
    END as growth
  FROM current_period cp
  LEFT JOIN previous_period pp ON cp.asin = pp.asin
  ORDER BY cp.current_revenue DESC
  LIMIT 5;
END;
$$ LANGUAGE plpgsql;