/*
  # Add trends functionality

  1. New Functions
    - get_sales_data: Gets daily sales data for the specified period
    - get_top_products: Gets top selling products with metrics
    - get_dashboard_stats: Gets overall dashboard statistics
*/

-- Function to get sales data for a specific period
CREATE OR REPLACE FUNCTION get_sales_data(
  start_date timestamptz,
  end_date timestamptz
)
RETURNS TABLE (
  date date,
  sales bigint,
  revenue numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    DATE(ao.created_at) as date,
    COUNT(DISTINCT ao.amazon_order_id) as sales,
    COALESCE(SUM(ao.amount), 0) as revenue
  FROM amazon_orders ao
  WHERE ao.created_at >= start_date
  AND ao.created_at <= end_date
  GROUP BY DATE(ao.created_at)
  ORDER BY date;
END;
$$;

-- Function to get top products with metrics
CREATE OR REPLACE FUNCTION get_top_products(
  start_date timestamptz DEFAULT NOW() - INTERVAL '30 days',
  end_date timestamptz DEFAULT NOW()
)
RETURNS TABLE (
  name text,
  category text,
  sales bigint,
  revenue numeric,
  growth numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  previous_start timestamptz := start_date - (end_date - start_date);
  previous_end timestamptz := start_date;
BEGIN
  RETURN QUERY
  WITH current_period AS (
    SELECT 
      p.name,
      p.type as category,
      COUNT(DISTINCT ao.amazon_order_id) as sales,
      SUM(ao.amount * (aoi.quantity_ordered::numeric / (
        SELECT SUM(quantity_ordered) 
        FROM amazon_order_items 
        WHERE amazon_order_id = ao.amazon_order_id
      ))) as revenue
    FROM products p
    JOIN product_amazon_products pap ON p.id = pap.product_id
    JOIN amazon_products ap ON ap.id = pap.amazon_product_id
    JOIN amazon_order_items aoi ON ap.asin = aoi.asin
    JOIN amazon_orders ao ON aoi.amazon_order_id = ao.amazon_order_id
    WHERE ao.created_at BETWEEN start_date AND end_date
    GROUP BY p.id, p.name, p.type
  ),
  previous_period AS (
    SELECT 
      p.name,
      COUNT(DISTINCT ao.amazon_order_id) as previous_sales
    FROM products p
    JOIN product_amazon_products pap ON p.id = pap.product_id
    JOIN amazon_products ap ON ap.id = pap.amazon_product_id
    JOIN amazon_order_items aoi ON ap.asin = aoi.asin
    JOIN amazon_orders ao ON aoi.amazon_order_id = ao.amazon_order_id
    WHERE ao.created_at BETWEEN previous_start AND previous_end
    GROUP BY p.id, p.name
  )
  SELECT 
    cp.name,
    cp.category,
    cp.sales,
    cp.revenue,
    CASE 
      WHEN pp.previous_sales IS NULL OR pp.previous_sales = 0 THEN 100
      ELSE ((cp.sales - pp.previous_sales)::numeric / pp.previous_sales * 100)
    END as growth
  FROM current_period cp
  LEFT JOIN previous_period pp ON cp.name = pp.name
  ORDER BY cp.revenue DESC
  LIMIT 10;
END;
$$;

-- Function to get dashboard statistics
CREATE OR REPLACE FUNCTION get_dashboard_stats(
  start_date timestamptz DEFAULT NOW() - INTERVAL '30 days',
  end_date timestamptz DEFAULT NOW()
)
RETURNS TABLE (
  total_sales bigint,
  total_revenue numeric,
  average_order_value numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(DISTINCT amazon_order_id)::bigint as total_sales,
    COALESCE(SUM(amount), 0) as total_revenue,
    CASE 
      WHEN COUNT(DISTINCT amazon_order_id) = 0 THEN 0
      ELSE COALESCE(SUM(amount) / COUNT(DISTINCT amazon_order_id), 0)
    END as average_order_value
  FROM amazon_orders
  WHERE created_at BETWEEN start_date AND end_date;
END;
$$;