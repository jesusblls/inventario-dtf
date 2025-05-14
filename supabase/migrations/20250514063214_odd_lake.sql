/*
  # Products Schema

  1. New Tables
    - `amazon_products`
      - `id` (uuid, primary key)
      - `asin` (text, unique) - Amazon Standard Identification Number
      - `title` (text) - Título del producto en Amazon
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
      
    - `products`
      - `id` (uuid, primary key)
      - `name` (text) - Nombre del producto local
      - `amazon_product_id` (uuid, foreign key) - Relación con producto de Amazon
      - `stock` (integer) - Stock disponible
      - `size` (text) - Talla (S, M, L, XL, etc)
      - `color` (text) - Color
      - `type` (text) - Tipo de corte (regular, oversize)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
      
    - `designs`
      - `id` (uuid, primary key)
      - `name` (text) - Nombre del diseño
      - `stock` (integer) - Stock disponible del diseño DTF
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

    - `product_designs`
      - `id` (uuid, primary key)
      - `product_id` (uuid, foreign key)
      - `design_id` (uuid, foreign key)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users

  3. Functions
    - `decrease_stock` - Reduce el stock cuando se vende un producto
    - `sync_amazon_order` - Sincroniza una orden de Amazon
*/

-- Amazon Products Table
CREATE TABLE amazon_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  asin text UNIQUE NOT NULL,
  title text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE amazon_products ENABLE ROW LEVEL SECURITY;

-- Products Table
CREATE TABLE products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  amazon_product_id uuid REFERENCES amazon_products(id),
  stock integer NOT NULL DEFAULT 0,
  size text NOT NULL,
  color text NOT NULL,
  type text NOT NULL CHECK (type IN ('regular', 'oversize')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE products ENABLE ROW LEVEL SECURITY;

-- Designs Table
CREATE TABLE designs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  stock integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE designs ENABLE ROW LEVEL SECURITY;

-- Product Designs Table (Many-to-Many relationship)
CREATE TABLE product_designs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid REFERENCES products(id) ON DELETE CASCADE,
  design_id uuid REFERENCES designs(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(product_id, design_id)
);

ALTER TABLE product_designs ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Allow read for authenticated users" ON amazon_products
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow read for authenticated users" ON products
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow read for authenticated users" ON designs
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow read for authenticated users" ON product_designs
  FOR SELECT TO authenticated USING (true);

-- Functions
CREATE OR REPLACE FUNCTION decrease_stock(
  p_product_id uuid,
  quantity integer DEFAULT 1
) RETURNS void
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_design_id uuid;
BEGIN
  -- Decrease product stock
  UPDATE products 
  SET stock = stock - quantity,
      updated_at = now()
  WHERE id = p_product_id AND stock >= quantity;

  -- Get associated design
  SELECT design_id INTO v_design_id
  FROM product_designs
  WHERE product_id = p_product_id
  LIMIT 1;

  -- Decrease design stock if exists
  IF v_design_id IS NOT NULL THEN
    UPDATE designs
    SET stock = stock - quantity,
        updated_at = now()
    WHERE id = v_design_id AND stock >= quantity;
  END IF;
END;
$$;

-- Function to sync Amazon order
CREATE OR REPLACE FUNCTION sync_amazon_order(
  p_asin text,
  p_quantity integer
) RETURNS void
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_product_id uuid;
BEGIN
  -- Get the product ID associated with the Amazon ASIN
  SELECT p.id INTO v_product_id
  FROM products p
  JOIN amazon_products ap ON p.amazon_product_id = ap.id
  WHERE ap.asin = p_asin
  LIMIT 1;

  -- If product found, decrease stock
  IF v_product_id IS NOT NULL THEN
    PERFORM decrease_stock(v_product_id, p_quantity);
  END IF;
END;
$$;