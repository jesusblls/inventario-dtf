/*
  # Update sync functionality to handle inventory

  1. Changes
    - Add function to decrease inventory for products and designs
    - Update sync_amazon_order function to handle inventory updates
    - Add function to get related products and designs for an Amazon product
*/

-- Function to get related products and designs for an Amazon product
CREATE OR REPLACE FUNCTION get_amazon_product_relations(p_asin text)
RETURNS TABLE (
  product_id uuid,
  design_id uuid
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  WITH amazon_product AS (
    SELECT id FROM amazon_products WHERE asin = p_asin
  ),
  product_relations AS (
    SELECT DISTINCT p.id as product_id
    FROM products p
    JOIN product_amazon_products pap ON pap.product_id = p.id
    JOIN amazon_product ap ON ap.id = pap.amazon_product_id
  ),
  design_relations AS (
    SELECT DISTINCT d.id as design_id
    FROM designs d
    JOIN design_amazon_products dap ON dap.design_id = d.id
    JOIN amazon_product ap ON ap.id = dap.amazon_product_id
  )
  SELECT pr.product_id, dr.design_id
  FROM product_relations pr
  FULL OUTER JOIN design_relations dr ON true;
END;
$$;

-- Function to decrease inventory
CREATE OR REPLACE FUNCTION decrease_inventory(
  p_product_id uuid,
  p_design_id uuid,
  p_quantity integer DEFAULT 1
)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  -- Decrease product stock if product_id is provided
  IF p_product_id IS NOT NULL THEN
    UPDATE products 
    SET 
      stock = GREATEST(stock - p_quantity, 0),
      updated_at = now()
    WHERE id = p_product_id;
  END IF;

  -- Decrease design stock if design_id is provided
  IF p_design_id IS NOT NULL THEN
    UPDATE designs
    SET 
      stock = GREATEST(stock - p_quantity, 0),
      updated_at = now()
    WHERE id = p_design_id;
  END IF;
END;
$$;

-- Update sync_amazon_order function to handle inventory
CREATE OR REPLACE FUNCTION sync_amazon_order(
  p_order_id text,
  p_status text,
  p_amount decimal DEFAULT 0
)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  v_item RECORD;
  v_relation RECORD;
BEGIN
  -- Insert or update order
  INSERT INTO amazon_orders (amazon_order_id, status, amount, last_sync_date)
  VALUES (p_order_id, p_status, p_amount, now())
  ON CONFLICT (amazon_order_id) 
  DO UPDATE SET 
    status = EXCLUDED.status,
    amount = EXCLUDED.amount,
    last_sync_date = now(),
    updated_at = now();

  -- Get order items from SP-API response and update inventory
  FOR v_item IN 
    SELECT 
      asin,
      quantity_ordered::integer as quantity
    FROM amazon_order_items
    WHERE amazon_order_id = p_order_id
  LOOP
    -- Get related products and designs
    FOR v_relation IN 
      SELECT * FROM get_amazon_product_relations(v_item.asin)
    LOOP
      -- Decrease inventory for both product and design
      PERFORM decrease_inventory(
        v_relation.product_id,
        v_relation.design_id,
        v_item.quantity
      );
    END LOOP;
  END LOOP;
END;
$$;