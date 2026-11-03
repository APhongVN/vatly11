-- Enforce the same group submission limits even for direct authenticated Supabase writes.
CREATE OR REPLACE FUNCTION public.validate_group_submission_payload()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_prefix TEXT;
  v_filename TEXT;
  v_file_changed BOOLEAN;
BEGIN
  IF public.is_teacher() THEN
    RETURN NEW;
  END IF;

  IF char_length(COALESCE(NEW.answer, '')) > 12000 THEN
    RAISE EXCEPTION 'Group answer exceeds 12000 characters' USING ERRCODE = '22023';
  END IF;

  IF TG_OP = 'INSERT' THEN
    NEW.created_at := now();
    v_file_changed := NEW.file_url IS NOT NULL;
  ELSE
    NEW.created_at := OLD.created_at;
    v_file_changed := NEW.file_url IS DISTINCT FROM OLD.file_url;
  END IF;
  NEW.submitted_at := now();

  IF v_file_changed AND NEW.file_url IS NOT NULL THEN
    IF char_length(NEW.file_url) > 2000 THEN
      RAISE EXCEPTION 'Group submission file URL is too long' USING ERRCODE = '22023';
    END IF;

    v_prefix := 'group-submissions/' || auth.uid()::TEXT || '/';
    IF NEW.file_url LIKE v_prefix || '%' THEN
      v_filename := substring(NEW.file_url FROM char_length(v_prefix) + 1);
      IF v_filename !~ '^[A-Za-z0-9._ -]{1,255}$' THEN
        RAISE EXCEPTION 'Invalid private group submission path' USING ERRCODE = '22023';
      END IF;
    ELSIF NEW.file_url !~ '^https?://[^[:space:]]+$'
       OR NEW.file_url ~* '^https?://[^/]*@' THEN
      RAISE EXCEPTION 'Group submission must reference its own upload or a safe HTTP(S) link' USING ERRCODE = '22023';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.validate_group_submission_payload() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS group_submissions_validate_payload ON public.group_submissions;
CREATE TRIGGER group_submissions_validate_payload
BEFORE INSERT OR UPDATE ON public.group_submissions
FOR EACH ROW EXECUTE FUNCTION public.validate_group_submission_payload();
