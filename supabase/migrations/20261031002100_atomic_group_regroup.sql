-- Reassign group members in one transaction and keep group history intact.
CREATE OR REPLACE FUNCTION public.regroup_assignment_students(
  p_assignment_id UUID,
  p_group_count INTEGER,
  p_max_students INTEGER,
  p_random BOOLEAN DEFAULT FALSE
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  v_student_count INTEGER;
  v_existing_group_count INTEGER;
  v_submission_count INTEGER;
  v_index INTEGER;
  v_group_id UUID;
BEGIN
  IF NOT public.is_teacher() THEN
    RAISE EXCEPTION 'Teacher role required' USING ERRCODE = '42501';
  END IF;
  IF p_group_count IS NULL OR p_group_count NOT BETWEEN 1 AND 50
     OR p_max_students IS NULL OR p_max_students NOT BETWEEN 1 AND 100 THEN
    RAISE EXCEPTION 'Group size settings are out of range' USING ERRCODE = '22023';
  END IF;
  PERFORM 1 FROM public.group_assignments WHERE id = p_assignment_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Group assignment not found' USING ERRCODE = '22023';
  END IF;
  LOCK TABLE public.students IN SHARE MODE;

  SELECT COUNT(*) INTO v_submission_count
  FROM public.group_submissions
  WHERE assignment_id = p_assignment_id;
  IF v_submission_count > 0 THEN
    RAISE EXCEPTION 'Cannot regroup after group work has been submitted' USING ERRCODE = '22023';
  END IF;

  SELECT COUNT(*) INTO v_student_count FROM public.students;
  IF v_student_count = 0 THEN
    RAISE EXCEPTION 'Import students before creating groups' USING ERRCODE = '22023';
  END IF;
  IF v_student_count > p_group_count * p_max_students THEN
    RAISE EXCEPTION 'Group capacity is smaller than the class size' USING ERRCODE = '22023';
  END IF;

  SELECT COUNT(*) INTO v_existing_group_count
  FROM public.group_assignment_groups
  WHERE assignment_id = p_assignment_id;

  IF v_existing_group_count <> p_group_count THEN
    DELETE FROM public.group_assignment_groups WHERE assignment_id = p_assignment_id;
    FOR v_index IN 1..p_group_count LOOP
      INSERT INTO public.group_assignment_groups (assignment_id, group_number, group_name)
      VALUES (p_assignment_id, v_index, 'Nhóm ' || v_index)
      RETURNING id INTO v_group_id;
    END LOOP;
  END IF;

  DELETE FROM public.group_assignment_members AS members
  USING public.group_assignment_groups AS groups
  WHERE members.group_id = groups.id AND groups.assignment_id = p_assignment_id;

  WITH ranked_students AS (
    SELECT id,
      ROW_NUMBER() OVER (
        ORDER BY CASE WHEN COALESCE(p_random, FALSE) THEN random() ELSE 0 END,
                 LOWER(full_name), id
      ) AS position
    FROM public.students
  )
  INSERT INTO public.group_assignment_members (group_id, student_id)
  SELECT groups.id, ranked_students.id
  FROM ranked_students
  JOIN public.group_assignment_groups AS groups
    ON groups.assignment_id = p_assignment_id
   AND groups.group_number = ((ranked_students.position - 1) / p_max_students) + 1;

  RETURN v_student_count;
END;
$$;

REVOKE ALL ON FUNCTION public.regroup_assignment_students(UUID, INTEGER, INTEGER, BOOLEAN) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.regroup_assignment_students(UUID, INTEGER, INTEGER, BOOLEAN) TO authenticated;
-- Serialize submissions with regrouping so membership cannot change mid-submit.
CREATE OR REPLACE FUNCTION public.normalize_group_submission()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_assignment_id UUID;
  v_group_number INTEGER;
  v_group_name TEXT;
BEGIN
  SELECT assignment.id INTO v_assignment_id
  FROM public.group_assignments AS assignment
  WHERE assignment.id = NEW.assignment_id
  FOR UPDATE;
  IF v_assignment_id IS NULL THEN
    RAISE EXCEPTION 'Invalid group assignment';
  END IF;

  SELECT group_row.group_number, NULLIF(BTRIM(group_row.group_name), '')
    INTO v_group_number, v_group_name
  FROM public.group_assignment_groups AS group_row
  WHERE group_row.id = NEW.group_id
    AND group_row.assignment_id = NEW.assignment_id;
  IF v_group_number IS NULL THEN
    RAISE EXCEPTION 'Invalid group assignment';
  END IF;
  IF NOT public.is_teacher() AND NOT EXISTS (
    SELECT 1
    FROM public.group_assignment_members AS member
    JOIN public.students AS student ON student.id = member.student_id
    WHERE member.group_id = NEW.group_id
      AND student.auth_user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Student is not a member of this group';
  END IF;

  NEW.group_name := COALESCE(v_group_name, 'Nhóm ' || v_group_number);
  IF NOT public.is_teacher() THEN
    NEW.ai_score := NULL;
    NEW.final_score := NULL;
    NEW.ai_feedback := NULL;
    NEW.ai_model_answer := NULL;
    NEW.status := 'pending';
  END IF;
  RETURN NEW;
END;
$$;