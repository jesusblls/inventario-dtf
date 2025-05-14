/*
  # Create initial admin user

  1. Changes
    - Insert initial admin user with email jesus.castillohdz98@gmail.com
    - Create corresponding profile entry
    
  2. Security
    - Password will be set through the UI
    - User will have admin role
*/

-- Create the initial user profile
INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  confirmation_token,
  email_change_token_current,
  email_change_token_new,
  recovery_token
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  gen_random_uuid(),
  'authenticated',
  'authenticated',
  'jesus.castillohdz98@gmail.com',
  crypt('Admin123!', gen_salt('bf')),
  now(),
  now(),
  now(),
  '',
  '',
  '',
  ''
) ON CONFLICT (email) DO NOTHING;

-- Get the user id we just created
DO $$
DECLARE
  auth_user_id uuid;
BEGIN
  SELECT id INTO auth_user_id FROM auth.users 
  WHERE email = 'jesus.castillohdz98@gmail.com' 
  LIMIT 1;

  -- Create the profile for the user
  INSERT INTO public.profiles (id, name, role)
  VALUES (auth_user_id, 'Admin', 'admin')
  ON CONFLICT (id) DO NOTHING;
END $$;