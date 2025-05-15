/*
  # Fix alert settings table and RLS policies

  1. Changes
    - Create alert_settings table if it doesn't exist
    - Add type column as primary key for upsert operations
    - Drop and recreate RLS policies with proper permissions
    - Enable RLS on the table

  2. Security
    - Maintain security by only allowing authenticated users
    - Enable all necessary operations (select, insert, update) with proper checks
    - Ensure upsert operations work correctly using type as the conflict key
*/

-- Create the table if it doesn't exist
CREATE TABLE IF NOT EXISTS alert_settings (
    type text PRIMARY KEY,
    settings jsonb NOT NULL DEFAULT '{}'::jsonb,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Drop existing policies
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON alert_settings;
DROP POLICY IF EXISTS "Enable insert access for authenticated users" ON alert_settings;
DROP POLICY IF EXISTS "Enable update access for authenticated users" ON alert_settings;

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