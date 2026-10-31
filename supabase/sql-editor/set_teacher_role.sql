-- Run only after creating and verifying the teacher in Supabase Auth.
-- Replace the placeholder with the verified account email before execution.
DO $$
DECLARE
  teacher_email TEXT := 'REPLACE_WITH_VERIFIED_TEACHER_EMAIL';
  teacher_id UUID;
BEGIN
  SELECT id INTO teacher_id
  FROM auth.users
  WHERE lower(email) = lower(teacher_email)
  LIMIT 1;

  IF teacher_id IS NULL THEN
    RAISE EXCEPTION 'No Auth user found for the supplied teacher email';
  END IF;

  INSERT INTO public.profiles (id, role, full_name)
  VALUES (teacher_id, 'teacher', COALESCE((SELECT raw_user_meta_data->>'full_name' FROM auth.users WHERE id = teacher_id), teacher_email))
  ON CONFLICT (id) DO UPDATE SET role = 'teacher';
END $$;
