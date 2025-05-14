/*
  # Add product-amazon relation table

  1. New Tables
    - `product_amazon_products`
      - `id` (uuid, primary key)
      - `product_id` (uuid, foreign key)
      - `amazon_product_id` (uuid, foreign key)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on new table
    - Add policies for authenticated users
*/

-- Create product_amazon_products table
CREATE TABLE IF NOT EXISTS product_amazon_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid REFERENCES products(id) ON DELETE CASCADE,
  amazon_product_id uuid REFERENCES amazon_products(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(product_id, amazon_product_id)
);

-- Enable RLS
ALTER TABLE product_amazon_products ENABLE ROW LEVEL SECURITY;

-- Add RLS policies
CREATE POLICY "Allow read for authenticated users"
  ON product_amazon_products
  FOR SELECT
  TO authenticated
  USING (true);

-- Remove old foreign key if exists
ALTER TABLE products DROP CONSTRAINT IF EXISTS products_amazon_product_id_fkey;

-- Drop column amazon_product_id from products
ALTER TABLE products DROP COLUMN IF EXISTS amazon_product_id;