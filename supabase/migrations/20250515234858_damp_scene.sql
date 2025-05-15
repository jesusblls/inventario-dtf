/*
  # Fix Alert Settings RLS Policies

  1. Changes
    - Add threshold column to alert_settings table
    - Drop and recreate table with proper structure
    - Create proper RLS policies for all operations
    - Add initial default values for alert settings

  2. Security
    - Enable RLS on alert_settings table
    - Allow all authenticated users to read settings
    - Allow all authenticated users to update settings (required for the app to function)
*/

-- First drop existing policies
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON alert_settings;
DROP POLICY IF EXISTS "Enable insert access for authenticated users" ON alert_settings;
DROP POLICY IF EXISTS "Enable update access for authenticated users" ON alert_settings;

-- Drop and recreate the table with proper structure
DROP TABLE IF EXISTS alert_settings;

CREATE TABLE alert_settings (
    type text PRIMARY KEY,
    threshold integer NOT NULL,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE alert_settings ENABLE ROW LEVEL SECURITY;

-- Create comprehensive RLS policies
CREATE POLICY "Enable read access for authenticated users"
ON alert_settings FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Enable insert/update access for authenticated users"
ON alert_settings
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- Insert default values
INSERT INTO alert_settings (type, threshold)
VALUES 
    ('low_stock', 10),
    ('high_demand', 50)
ON CONFLICT (type) DO NOTHING;