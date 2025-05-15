/*
  # Fix alerts and products relationship

  1. Changes
    - Drop and recreate alerts table with proper foreign key constraint
    - Add explicit foreign key reference to products table
    - Ensure products table exists before creating relationship
    - Add proper indexes for performance

  2. Security
    - Maintain existing RLS policies
*/

-- First ensure the products table exists
CREATE TABLE IF NOT EXISTS products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  stock integer NOT NULL DEFAULT 0,
  size text,
  color text,
  type text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Drop existing alerts table
DROP TABLE IF EXISTS alerts;

-- Recreate alerts table with explicit foreign key reference
CREATE TABLE alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL,
  type text NOT NULL CHECK (type IN ('low_stock', 'high_demand')),
  threshold integer NOT NULL,
  current_value integer NOT NULL,
  status text NOT NULL CHECK (status IN ('pending', 'handled')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  handled_at timestamptz,
  CONSTRAINT fk_product
    FOREIGN KEY (product_id) 
    REFERENCES products (id)
    ON DELETE CASCADE
);

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_alerts_product_id ON alerts(product_id);
CREATE INDEX IF NOT EXISTS idx_alerts_status ON alerts(status);
CREATE INDEX IF NOT EXISTS idx_alerts_type ON alerts(type);

-- Enable RLS
ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;

-- Recreate RLS policies
CREATE POLICY "Allow read for authenticated users"
  ON alerts
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow insert for authenticated users"
  ON alerts
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow update for authenticated users"
  ON alerts
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);