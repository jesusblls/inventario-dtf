/*
  # Add Design Amazon Products Relationship

  1. New Tables
    - `design_amazon_products`
      - `id` (uuid, primary key)
      - `design_id` (uuid, foreign key)
      - `amazon_product_id` (uuid, foreign key)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS
    - Add policies for authenticated users
*/

-- Create design_amazon_products table
CREATE TABLE IF NOT EXISTS design_amazon_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  design_id uuid REFERENCES designs(id) ON DELETE CASCADE,
  amazon_product_id uuid REFERENCES amazon_products(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(design_id, amazon_product_id)
);

-- Enable RLS
ALTER TABLE design_amazon_products ENABLE ROW LEVEL SECURITY;

-- Add RLS policies
CREATE POLICY "Allow read for authenticated users"
  ON design_amazon_products
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can create design_amazon_products"
  ON design_amazon_products
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update design_amazon_products"
  ON design_amazon_products
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Users can delete design_amazon_products"
  ON design_amazon_products
  FOR DELETE
  TO authenticated
  USING (true);