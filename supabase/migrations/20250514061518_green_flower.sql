/*
  # Update user role to admin

  1. Changes
    - Updates the role of user 'jesus muser' to 'admin' in the profiles table
    
  2. Notes
    - Uses a safe update that only modifies the role if the user exists
    - Maintains existing data integrity
*/

DO $$ 
BEGIN 
  UPDATE profiles 
  SET role = 'admin'
  WHERE id IN (
    SELECT id 
    FROM auth.users 
    WHERE email LIKE '%jesus%muser%'
  );
END $$;