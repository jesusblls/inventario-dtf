/*
  # Add RLS policies for designs table

  1. Changes
    - Add policies to allow authenticated users to:
      - Insert new designs
      - Update their own designs
      - Delete their own designs
    - Add owner_id column to track design ownership
  
  2. Security
    - Enable RLS (already enabled)
    - Add policies for INSERT, UPDATE, and DELETE operations
    - Ensure users can only modify their own designs
*/

-- Add owner_id column if it doesn't exist
DO $$ 
BEGIN 
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'designs' AND column_name = 'owner_id'
  ) THEN
    ALTER TABLE designs ADD COLUMN owner_id uuid REFERENCES auth.users(id);
  END IF;
END $$;

-- Set default value for owner_id to the authenticated user's ID
ALTER TABLE designs ALTER COLUMN owner_id SET DEFAULT auth.uid();

-- Policy to allow authenticated users to insert new designs
CREATE POLICY "Users can create designs"
ON designs
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = owner_id);

-- Policy to allow users to update their own designs
CREATE POLICY "Users can update own designs"
ON designs
FOR UPDATE
TO authenticated
USING (auth.uid() = owner_id)
WITH CHECK (auth.uid() = owner_id);

-- Policy to allow users to delete their own designs
CREATE POLICY "Users can delete own designs"
ON designs
FOR DELETE
TO authenticated
USING (auth.uid() = owner_id);