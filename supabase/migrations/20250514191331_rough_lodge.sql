/*
  # Add RLS policies for products table

  1. Security Changes
    - Add INSERT policy for authenticated users
    - Add UPDATE policy for authenticated users
    - Add DELETE policy for authenticated users

  Note: The SELECT policy already exists and is working correctly
*/

-- Allow authenticated users to insert new products
CREATE POLICY "Users can create products"
ON products
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Allow authenticated users to update products
CREATE POLICY "Users can update products"
ON products
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- Allow authenticated users to delete products
CREATE POLICY "Users can delete products"
ON products
FOR DELETE
TO authenticated
USING (true);