/*
  # Update user password

  Updates the password for a specific user in the auth.users table.
*/

DO $$
BEGIN
  -- Update the password for the specific user
  UPDATE auth.users
  SET encrypted_password = crypt('muse', gen_salt('bf', 10))
  WHERE email = 'jesus.muser@gmail.com';
END $$;