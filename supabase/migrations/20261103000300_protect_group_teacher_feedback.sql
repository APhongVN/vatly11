-- Students may edit their own group submission, but must never write teacher feedback.
CREATE OR REPLACE FUNCTION public.protect_group_submission_teacher_feedback()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NOT public.is_teacher() THEN
    IF TG_OP = 'INSERT' THEN
      NEW.teacher_feedback := NULL;
    ELSE
      NEW.teacher_feedback := OLD.teacher_feedback;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.protect_group_submission_teacher_feedback() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS group_submissions_protect_teacher_feedback ON public.group_submissions;
CREATE TRIGGER group_submissions_protect_teacher_feedback
BEFORE INSERT OR UPDATE ON public.group_submissions
FOR EACH ROW EXECUTE FUNCTION public.protect_group_submission_teacher_feedback();