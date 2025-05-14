/*
  # Create initial admin user

  1. Changes
    - Create admin user in auth.users
    - Create corresponding profile in public.profiles
  
  2. Security
    - Uses pgcrypto for password encryption
    - Sets up proper role and metadata
*/

-- Enable the required extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create the initial user
WITH new_user AS (
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
  )
  ON CONFLICT (email) DO NOTHING
  RETURNING id
)
INSERT INTO public.profiles (id, name, role)
SELECT 
  id,
  'Admin',
  'admin'
FROM new_user
ON CONFLICT (id) DO NOTHING;