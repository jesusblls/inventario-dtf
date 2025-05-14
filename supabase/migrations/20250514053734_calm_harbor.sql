/*
  # Create initial admin user

  1. New Users
    - Creates an admin user with email confirmation
    - Sets up proper authentication metadata
  
  2. Profile Setup
    - Creates corresponding profile entry
    - Assigns admin role
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
  is_super_admin
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
  false
);

-- Create the profile for the user
INSERT INTO public.profiles (id, name, role)
SELECT 
  id,
  'Admin',
  'admin'
FROM auth.users
WHERE email = 'jesus.castillohdz98@gmail.com';