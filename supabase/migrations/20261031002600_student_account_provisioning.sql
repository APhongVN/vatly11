-- Teacher-provisioned student accounts use one-time passwords that must be changed at first login.
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS login_email TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN NOT NULL DEFAULT FALSE;
CREATE UNIQUE INDEX IF NOT EXISTS idx_students_login_email_unique
  ON public.students (LOWER(login_email)) WHERE login_email IS NOT NULL;

CREATE OR REPLACE FUNCTION public.create_student_profile()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (id, role, full_name, must_change_password)
  VALUES (
    NEW.id,
    'student',
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', ''),
    COALESCE(NEW.raw_user_meta_data ->> 'must_change_password' = 'true', FALSE)
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;
