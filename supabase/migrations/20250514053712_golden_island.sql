/*
  # Create initial admin user

  1. New Data
    - Creates admin user in auth.users
    - Creates corresponding profile in public.profiles
    
  2. Security
    - User is created with authenticated role
    - Profile is created with admin role
*/

-- Enable the required extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create the initial user
INSERT INTO auth.users (
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  raw_app_meta_data,
  raw_user_meta_data,
  is_super_admin,
  confirmed_at
) VALUES (
  gen_random_uuid(),
  'authenticated',
  'authenticated',
  'jesus.castillohdz98@gmail.com',
  crypt('Admin123!', gen_salt('bf')),
  now(),
  now(),
  now(),
  '{"provider":"email","providers":["email"]}',
  '{}',
  false,
  now()
);

-- Create the profile for the user
INSERT INTO public.profiles (id, name, role)
SELECT 
  id,
  'Admin',
  'admin'
FROM auth.users
WHERE email = 'jesus.castillohdz98@gmail.com';