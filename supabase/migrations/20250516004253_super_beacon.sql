/*
  # Fix alert settings RLS policies

  1. Changes
    - Update RLS policies for alert_settings table to allow upsert operations
    - Add INSERT policy for authenticated users
    - Modify UPDATE policy to use proper check conditions

  2. Security
    - Enable RLS on alert_settings table (already enabled)
    - Add policy for authenticated users to insert rows
    - Update existing policies to properly handle upsert operations
*/

-- Drop existing policies that might conflict
DROP POLICY IF EXISTS "Allow update for authenticated users" ON alert_settings;
DROP POLICY IF EXISTS "Users can insert alert settings" ON alert_settings;

-- Create new policies with proper permissions
CREATE POLICY "Users can insert alert settings"
ON alert_settings
FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Users can update alert settings"
ON alert_settings
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);