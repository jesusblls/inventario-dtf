/*
  # Fix RLS policies for designs table

  1. Changes
    - Drop existing RLS policies for designs table
    - Create new RLS policies that properly handle owner_id
    
  2. Security
    - Enable RLS on designs table (already enabled)
    - Add policies for:
      - Select: Allow authenticated users to read all designs
      - Insert: Allow authenticated users to create designs with their user ID
      - Update: Allow users to update their own designs
      - Delete: Allow users to delete their own designs
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Allow read for authenticated users" ON designs;
DROP POLICY IF EXISTS "Users can create designs" ON designs;
DROP POLICY IF EXISTS "Users can delete own designs" ON designs;
DROP POLICY IF EXISTS "Users can update own designs" ON designs;

-- Create new policies
CREATE POLICY "Allow read for authenticated users"
ON designs
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Users can create designs"
ON designs
FOR INSERT
TO authenticated
WITH CHECK (
  owner_id = auth.uid()
);

CREATE POLICY "Users can update own designs"
ON designs
FOR UPDATE
TO authenticated
USING (owner_id = auth.uid())
WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Users can delete own designs"
ON designs
FOR DELETE
TO authenticated
USING (owner_id = auth.uid());