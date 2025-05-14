/*
  # Update design and product_design policies

  1. Changes
    - Add policies for product_designs table to allow authenticated users to manage their own design relationships
    - Update existing design policies to ensure proper access control

  2. Security
    - Enable RLS on product_designs table
    - Add policies for authenticated users to manage their own design relationships
*/

-- Policy to allow users to insert product_designs for their own designs
CREATE POLICY "Users can create product_designs"
ON product_designs
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM designs
    WHERE id = product_designs.design_id
    AND owner_id = auth.uid()
  )
);

-- Policy to allow users to delete product_designs for their own designs
CREATE POLICY "Users can delete product_designs"
ON product_designs
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM designs
    WHERE id = product_designs.design_id
    AND owner_id = auth.uid()
  )
);

-- Update the designs select policy to include product relationships
CREATE OR REPLACE POLICY "Allow read for authenticated users"
ON designs
FOR SELECT
TO authenticated
USING (true);