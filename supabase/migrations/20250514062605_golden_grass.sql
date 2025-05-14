CREATE OR REPLACE FUNCTION get_users()
RETURNS TABLE (
  users json
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  IF (SELECT role FROM profiles WHERE id = auth.uid()) != 'admin' THEN
    RAISE EXCEPTION 'Only admins can view users';
  END IF;

  RETURN QUERY
  SELECT json_agg(
    json_build_object(
      'id', u.id,
      'email', u.email,
      'name', p.name,
      'role', p.role,
      'created_at', u.created_at,
      'last_sign_in_at', u.last_sign_in_at
    )
  )
  FROM auth.users u
  LEFT JOIN profiles p ON u.id = p.id;
END;
$$;

CREATE OR REPLACE FUNCTION delete_user(user_id uuid)
RETURNS void
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  IF (SELECT role FROM profiles WHERE id = auth.uid()) != 'admin' THEN
    RAISE EXCEPTION 'Only admins can delete users';
  END IF;

  DELETE FROM auth.users WHERE id = user_id;
END;
$$;