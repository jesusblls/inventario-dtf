/*
  # Add RLS policies for product_amazon_products table

  1. Changes
    - Add INSERT policy for authenticated users to create product_amazon_products entries
    - Add UPDATE policy for authenticated users to modify product_amazon_products entries
    - Add DELETE policy for authenticated users to remove product_amazon_products entries

  2. Security
    - Authenticated users can create new product-amazon product associations
    - Authenticated users can update existing associations
    - Authenticated users can delete associations
    - Maintains existing SELECT policy
*/

-- Add INSERT policy
CREATE POLICY "Users can create product_amazon_products"
ON public.product_amazon_products
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Add UPDATE policy
CREATE POLICY "Users can update product_amazon_products"
ON public.product_amazon_products
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- Add DELETE policy
CREATE POLICY "Users can delete product_amazon_products"
ON public.product_amazon_products
FOR DELETE
TO authenticated
USING (true);