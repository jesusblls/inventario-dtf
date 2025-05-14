/*
  # Create initial admin user

  1. Creates a new admin user with email and password authentication
  2. Creates a corresponding profile in the public.profiles table
*/

-- Create the initial user
DO $$
DECLARE
  new_user_id uuid;
BEGIN
  -- Insert the user if they don't exist
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
  RETURNING id INTO new_user_id;

  -- If we got a new user, create their profile
  IF new_user_id IS NOT NULL THEN
    INSERT INTO public.profiles (id, name, role)
    VALUES (new_user_id, 'Admin', 'admin');
  END IF;
END $$;