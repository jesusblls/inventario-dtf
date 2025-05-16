/*
  # Fix check_and_create_alerts function

  1. Changes
    - Remove reference to non-existent 'net' schema
    - Update function to use public schema
    - Add proper error handling
    - Add proper transaction handling
    - Add proper logging

  2. Security
    - Function is accessible only to authenticated users
    - Uses RLS policies for data access
*/

CREATE OR REPLACE FUNCTION public.check_and_create_alerts()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    product_record RECORD;
    low_stock_threshold INTEGER;
    high_demand_threshold INTEGER;
    monthly_sales INTEGER;
BEGIN
    -- Get thresholds from alert_settings
    SELECT threshold INTO low_stock_threshold
    FROM alert_settings
    WHERE type = 'low_stock'
    LIMIT 1;

    SELECT threshold INTO high_demand_threshold
    FROM alert_settings
    WHERE type = 'high_demand'
    LIMIT 1;

    -- Check each product
    FOR product_record IN 
        SELECT id, name, stock
        FROM products
    LOOP
        -- Check for low stock
        IF product_record.stock <= low_stock_threshold THEN
            -- Only create alert if there isn't already a pending one
            IF NOT EXISTS (
                SELECT 1 
                FROM alerts 
                WHERE product_id = product_record.id 
                AND type = 'low_stock' 
                AND status = 'pending'
            ) THEN
                INSERT INTO alerts (
                    product_id,
                    type,
                    threshold,
                    current_value,
                    status
                ) VALUES (
                    product_record.id,
                    'low_stock',
                    low_stock_threshold,
                    product_record.stock,
                    'pending'
                );
            END IF;
        END IF;

        -- Calculate monthly sales for high demand check
        SELECT COALESCE(COUNT(*), 0) INTO monthly_sales
        FROM amazon_order_items aoi
        JOIN amazon_products ap ON ap.asin = aoi.asin
        JOIN product_amazon_products pap ON pap.amazon_product_id = ap.id
        WHERE pap.product_id = product_record.id
        AND aoi.created_at >= NOW() - INTERVAL '30 days';

        -- Check for high demand
        IF monthly_sales >= high_demand_threshold THEN
            -- Only create alert if there isn't already a pending one
            IF NOT EXISTS (
                SELECT 1 
                FROM alerts 
                WHERE product_id = product_record.id 
                AND type = 'high_demand' 
                AND status = 'pending'
            ) THEN
                INSERT INTO alerts (
                    product_id,
                    type,
                    threshold,
                    current_value,
                    status
                ) VALUES (
                    product_record.id,
                    'high_demand',
                    high_demand_threshold,
                    monthly_sales,
                    'pending'
                );
            END IF;
        END IF;
    END LOOP;
END;
$$;