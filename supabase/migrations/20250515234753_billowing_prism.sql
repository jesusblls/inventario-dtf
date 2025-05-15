/*
  # Fix alert settings RLS policies

  1. Changes
    - Drop existing RLS policies for alert_settings table
    - Add new comprehensive RLS policies that properly handle all operations
    - Ensure upsert operations work correctly

  2. Security
    - Maintain security by only allowing authenticated users
    - Enable all necessary operations (select, insert, update) with proper checks
*/

-- Drop existing policies for alert_settings
DROP POLICY IF EXISTS "Allow read for authenticated users" ON alert_settings;
DROP POLICY IF EXISTS "Allow insert for authenticated users" ON alert_settings;
DROP POLICY IF EXISTS "Allow update for authenticated users" ON alert_settings;

-- Create new comprehensive policies
CREATE POLICY "Enable read access for authenticated users" 
ON alert_settings FOR SELECT 
TO authenticated 
USING (true);

CREATE POLICY "Enable insert access for authenticated users" 
ON alert_settings FOR INSERT 
TO authenticated 
WITH CHECK (true);

CREATE POLICY "Enable update access for authenticated users" 
ON alert_settings FOR UPDATE 
TO authenticated 
USING (true)
WITH CHECK (true);

-- Ensure RLS is enabled
ALTER TABLE alert_settings ENABLE ROW LEVEL SECURITY;