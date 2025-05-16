/*
  # Add INSERT policy for alerts table

  1. Changes
    - Add INSERT policy for alerts table to allow authenticated users to create new alerts
    
  2. Security
    - Adds RLS policy for INSERT operations on alerts table
    - Only authenticated users can create alerts
*/

CREATE POLICY "Allow insert for authenticated users"
  ON alerts
  FOR INSERT
  TO authenticated
  WITH CHECK (true);