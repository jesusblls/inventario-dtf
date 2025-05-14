/*
  # Create initial admin user

  1. New Data
    - Creates an admin user with the provided email
    - Sets up corresponding profile with admin role
    
  2. Security
    - Uses Supabase's built-in auth.users() function
    - Maintains existing RLS policies
*/

-- Create the admin user if it doesn't exist
DO $$
DECLARE
  new_user_id uuid;
BEGIN
  -- Insert into auth.users using Supabase's auth.create_user function
  SELECT id INTO new_user_id
  FROM auth.create_user(
    email := 'jesus.castillohdz98@gmail.com',
    password := 'Admin123!',
    email_confirm := true
  );

  -- Create corresponding profile with admin role
  INSERT INTO public.profiles (id, name, role)
  VALUES (new_user_id, 'Jesus Castillo', 'admin')
  ON CONFLICT (id) DO UPDATE
  SET role = 'admin'
  WHERE profiles.id = EXCLUDED.id;
END $$;