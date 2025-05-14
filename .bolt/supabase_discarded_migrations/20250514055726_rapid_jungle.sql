-- Create additional user
DO $$
DECLARE
  new_user_id uuid := gen_random_uuid();
BEGIN
  -- Insert the user with properly hashed password
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

  -- Create their profile
  INSERT INTO public.profiles (id, name, role)
  VALUES (new_user_id, 'Jesus M', 'user')
  ON CONFLICT (id) DO UPDATE 
  SET name = EXCLUDED.name,
      role = EXCLUDED.role;
END $$;