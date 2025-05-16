-- Function to check alert conditions
CREATE OR REPLACE FUNCTION debug_alert_conditions()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  low_stock_threshold integer;
  high_demand_threshold integer;
  low_stock_count integer;
  high_demand_count integer;
  result jsonb;
BEGIN
  -- Get current thresholds
  SELECT threshold INTO low_stock_threshold
  FROM alert_settings
  WHERE type = 'low_stock'
  LIMIT 1;

  SELECT threshold INTO high_demand_threshold
  FROM alert_settings
  WHERE type = 'high_demand'
  LIMIT 1;

  -- Count products with low stock
  SELECT COUNT(*) INTO low_stock_count
  FROM products
  WHERE stock < COALESCE(low_stock_threshold, 10);

  -- Count products with high demand
  WITH monthly_sales AS (
    SELECT 
      p.id,
      COUNT(*) as sales_count
    FROM products p
    JOIN product_amazon_products pap ON p.id = pap.product_id
    JOIN amazon_products ap ON ap.id = pap.amazon_product_id
    JOIN amazon_order_items aoi ON ap.asin = aoi.asin
    JOIN amazon_orders ao ON ao.amazon_order_id = aoi.amazon_order_id
    WHERE ao.created_at >= NOW() - INTERVAL '30 days'
    GROUP BY p.id
  )
  SELECT COUNT(*) INTO high_demand_count
  FROM monthly_sales
  WHERE sales_count >= COALESCE(high_demand_threshold, 50);

  -- Build result
  result = jsonb_build_object(
    'thresholds', jsonb_build_object(
      'low_stock', low_stock_threshold,
      'high_demand', high_demand_threshold
    ),
    'products_meeting_conditions', jsonb_build_object(
      'low_stock', low_stock_count,
      'high_demand', high_demand_count
    )
  );

  -- Update check record with counts
  UPDATE automated_checks
  SET items_processed = low_stock_count + high_demand_count
  WHERE type = 'alerts'
  AND completed_at IS NULL;

  RETURN result;
END;
$$;

-- Update run_automated_checks to include debugging
CREATE OR REPLACE FUNCTION run_automated_checks()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_check_id uuid;
  v_debug_info jsonb;
BEGIN
  -- Create check record
  INSERT INTO automated_checks (type, status)
  VALUES ('alerts', 'running')
  RETURNING id INTO v_check_id;

  BEGIN
    -- Get debug info
    v_debug_info := debug_alert_conditions();
    
    -- Run alert checks
    PERFORM check_and_create_alerts();

    -- Update check record as successful
    UPDATE automated_checks
    SET 
      status = 'completed',
      completed_at = now(),
      error_message = v_debug_info::text
    WHERE id = v_check_id;
  EXCEPTION WHEN OTHERS THEN
    -- Update check record with error
    UPDATE automated_checks
    SET 
      status = 'error',
      completed_at = now(),
      error_message = SQLERRM
    WHERE id = v_check_id;
    RAISE;
  END;
END;
$$;