/*
  # Update product designs policies

  1. Security
    - Add policy for users to create product_designs for their own designs
    - Add policy for users to delete product_designs for their own designs
    - Add policy for users to read all designs
*/

-- Drop existing policies if they exist
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'product_designs' 
    AND policyname = 'Users can create product_designs'
  ) THEN
    DROP POLICY "Users can create product_designs" ON product_designs;
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'product_designs' 
    AND policyname = 'Users can delete product_designs'
  ) THEN
    DROP POLICY "Users can delete product_designs" ON product_designs;
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'designs' 
    AND policyname = 'Allow read for authenticated users'
  ) THEN
    DROP POLICY "Allow read for authenticated users" ON designs;
  END IF;
END $$;

-- Create new policies
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

CREATE POLICY "Allow read for authenticated users"
ON designs
FOR SELECT
TO authenticated
USING (true);