/*
  # Add foreign key relationship between amazon_order_items and amazon_products

  1. Changes
    - Add foreign key constraint from amazon_order_items.asin to amazon_products.asin
    
  2. Security
    - No changes to RLS policies
*/

-- Add foreign key constraint
ALTER TABLE amazon_order_items
ADD CONSTRAINT amazon_order_items_asin_fkey
FOREIGN KEY (asin) REFERENCES amazon_products(asin)
ON DELETE CASCADE;