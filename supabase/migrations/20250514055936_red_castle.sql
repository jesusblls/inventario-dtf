/*
  # Add user with duplicate email handling
  
  1. Changes
    - Add new user if email doesn't exist
    - Update profile information
  
  2. Security
    - Uses proper password hashing
    - Maintains existing constraints
*/

DO $$
DECLARE
  new_user_id uuid := gen_random_uuid();
  existing_user_id uuid;
BEGIN
  -- Check if email already exists
  SELECT id INTO existing_user_id
  FROM auth.users
  WHERE email = 'jesus.muser@gmail.com';
  
  -- If email doesn't exist, create new user
  IF existing_user_id IS NULL THEN
    INSERT INTO auth.users (
      id,
      instance_id,
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
      '00000000-0000-0000-0000-000000000000',
      'authenticated',
      'authenticated',
      'jesus.muser@gmail.com',
      crypt('Admin123!', gen_salt('bf', 10)),
      now(),
      now(),
      now(),
      '{"provider":"email","providers":["email"]}',
      '{}',
      false
    );
    
    -- Create profile for new user
    INSERT INTO public.profiles (id, name, role)
    VALUES (new_user_id, 'Jesus M', 'user');
  ELSE
    -- Update existing user's profile
    UPDATE public.profiles
    SET name = 'Jesus M',
        role = 'user'
    WHERE id = existing_user_id;
  END IF;
END $$;