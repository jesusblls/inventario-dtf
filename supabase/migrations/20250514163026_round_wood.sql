/*
  # Add sync history tracking

  1. New Tables
    - `sync_history`
      - `id` (uuid, primary key)
      - `type` (text) - Type of sync (orders, products)
      - `start_date` (timestamptz) - Start date of sync range
      - `end_date` (timestamptz) - End date of sync range
      - `items_processed` (integer) - Number of items processed
      - `status` (text) - Status of sync (success, error)
      - `error_message` (text) - Error message if any
      - `created_at` (timestamptz) - When sync was performed
  
  2. Security
    - Enable RLS on `sync_history` table
    - Add policy for authenticated users to read sync history
*/

-- Create sync_history table
CREATE TABLE IF NOT EXISTS sync_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL,
  start_date timestamptz NOT NULL,
  end_date timestamptz NOT NULL,
  items_processed integer NOT NULL DEFAULT 0,
  status text NOT NULL,
  error_message text,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE sync_history ENABLE ROW LEVEL SECURITY;

-- Add RLS policies
CREATE POLICY "Allow read for authenticated users"
  ON sync_history
  FOR SELECT
  TO authenticated
  USING (true);

-- Function to get last successful sync date
CREATE OR REPLACE FUNCTION get_last_sync_date()
RETURNS timestamptz
LANGUAGE plpgsql
AS $$
DECLARE
  last_sync timestamptz;
BEGIN
  SELECT end_date 
  INTO last_sync
  FROM sync_history
  WHERE status = 'success'
  ORDER BY created_at DESC
  LIMIT 1;
  
  RETURN COALESCE(last_sync, '2023-01-01T00:00:00Z'::timestamptz);
END;
$$;