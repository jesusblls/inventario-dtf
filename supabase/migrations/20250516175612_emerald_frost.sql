/*
  # Fix designs table RLS policies

  1. Changes
    - Update RLS policies for the designs table to properly handle owner_id
    - Ensure users can only create designs they own
    - Ensure users can only modify their own designs
    - Allow users to read all designs (maintain existing policy)

  2. Security
    - Modify INSERT policy to properly check owner_id
    - Ensure UPDATE policy properly checks owner_id
    - Maintain existing SELECT policy for all authenticated users
*/

-- Drop existing policies to recreate them
DROP POLICY IF EXISTS "Users can create designs" ON designs;
DROP POLICY IF EXISTS "Users can update own designs" ON designs;

-- Recreate INSERT policy with proper owner_id check
CREATE POLICY "Users can create designs"
ON designs
FOR INSERT
TO authenticated
WITH CHECK (
  owner_id = auth.uid()
);

-- Recreate UPDATE policy with proper owner_id check
CREATE POLICY "Users can update own designs"
ON designs
FOR UPDATE
TO authenticated
USING (owner_id = auth.uid())
WITH CHECK (owner_id = auth.uid());