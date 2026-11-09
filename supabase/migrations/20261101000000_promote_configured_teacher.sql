-- The auth trigger creates new profiles with the student role by default.
-- Promote the already-created owner account so the production teacher login works.
DO $$
DECLARE
  teacher_user_id UUID;
BEGIN
  SELECT id INTO teacher_user_id
  FROM auth.users
  WHERE lower(email) = lower('huongxuan@vatly.com')
  LIMIT 1;

  IF teacher_user_id IS NULL THEN
    RAISE EXCEPTION 'Create the configured teacher account before applying this migration.';
  END IF;

  INSERT INTO public.profiles (id, role, full_name)
  SELECT id, 'teacher', COALESCE(NULLIF(raw_user_meta_data ->> 'full_name', ''), 'Giáo viên')
  FROM auth.users
  WHERE id = teacher_user_id
  ON CONFLICT (id) DO UPDATE SET role = 'teacher';
END;
$$;
