/*
  # Create admin user

  1. Creates an admin user with email and password authentication
  2. Creates a corresponding profile in the profiles table
*/

-- Create the initial user
DO $$
DECLARE
  new_user_id uuid := gen_random_uuid();
BEGIN
  -- Insert the user
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
    new_user_id,
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

  -- Create their profile
  INSERT INTO public.profiles (id, name, role)
  VALUES (new_user_id, 'Admin', 'admin');
END $$;