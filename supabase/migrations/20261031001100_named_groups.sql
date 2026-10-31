ALTER TABLE public.group_assignment_groups
  ADD COLUMN IF NOT EXISTS group_name TEXT NOT NULL DEFAULT '';

UPDATE public.group_assignment_groups
SET group_name = 'Nhóm ' || group_number
WHERE BTRIM(group_name) = '';

CREATE UNIQUE INDEX IF NOT EXISTS idx_group_assignment_groups_name
  ON public.group_assignment_groups(assignment_id, LOWER(group_name));

CREATE OR REPLACE FUNCTION public.normalize_group_submission()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_group_number INTEGER; v_group_name TEXT;
BEGIN
  SELECT group_number, NULLIF(BTRIM(group_name), '') INTO v_group_number, v_group_name
  FROM public.group_assignment_groups
  WHERE id = NEW.group_id AND assignment_id = NEW.assignment_id;
  IF v_group_number IS NULL THEN RAISE EXCEPTION 'Invalid group assignment'; END IF;
  IF NOT public.is_teacher() AND NOT EXISTS (
    SELECT 1 FROM public.group_assignment_members m JOIN public.students s ON s.id=m.student_id
    WHERE m.group_id=NEW.group_id AND s.auth_user_id=auth.uid()
  ) THEN RAISE EXCEPTION 'Student is not a member of this group'; END IF;
  NEW.group_name := COALESCE(v_group_name, 'Nhóm ' || v_group_number);
  IF NOT public.is_teacher() THEN
    NEW.ai_score := NULL; NEW.final_score := NULL; NEW.ai_feedback := NULL; NEW.ai_model_answer := NULL; NEW.status := 'pending';
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.sync_group_submission_name()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  UPDATE public.group_submissions
  SET group_name = COALESCE(NULLIF(BTRIM(NEW.group_name), ''), 'Nhóm ' || NEW.group_number)
  WHERE group_id = NEW.id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS group_name_sync_submissions ON public.group_assignment_groups;
CREATE TRIGGER group_name_sync_submissions
AFTER UPDATE OF group_name ON public.group_assignment_groups
FOR EACH ROW EXECUTE FUNCTION public.sync_group_submission_name();
