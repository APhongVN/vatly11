-- Archive a student account without deleting the student row or any linked work.
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS is_active BOOLEAN;
UPDATE public.students SET is_active = TRUE WHERE is_active IS NULL;
ALTER TABLE public.students ALTER COLUMN is_active SET DEFAULT TRUE;
ALTER TABLE public.students ALTER COLUMN is_active SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_students_active_class_name
  ON public.students (is_active, class_name, id);

-- New group tasks and regrouping use only active students. Existing memberships
-- remain attached to the same stable student id so historical group work survives.
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
  v_class_name TEXT;
BEGIN
  IF NOT public.is_teacher() THEN
    RAISE EXCEPTION 'Teacher role required' USING ERRCODE = '42501';
  END IF;
  IF p_group_count IS NULL OR p_group_count NOT BETWEEN 1 AND 50
     OR p_max_students IS NULL OR p_max_students NOT BETWEEN 1 AND 100 THEN
    RAISE EXCEPTION 'Group size settings are out of range' USING ERRCODE = '22023';
  END IF;
  SELECT class_name INTO v_class_name
  FROM public.group_assignments
  WHERE id = p_assignment_id
  FOR UPDATE;
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

  SELECT COUNT(*) INTO v_student_count
  FROM public.students AS student
  WHERE student.is_active IS TRUE
    AND (v_class_name IS NULL OR lower(btrim(student.class_name)) = lower(btrim(v_class_name)));
  IF v_student_count = 0 THEN
    RAISE EXCEPTION 'No active students found in the selected class' USING ERRCODE = '22023';
  END IF;
  IF v_student_count > p_group_count * p_max_students THEN
    RAISE EXCEPTION 'Group capacity is smaller than the active class size' USING ERRCODE = '22023';
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
    SELECT student.id,
      ROW_NUMBER() OVER (
        ORDER BY CASE WHEN COALESCE(p_random, FALSE) THEN random() ELSE 0 END,
                 LOWER(student.full_name), student.id
      ) AS position
    FROM public.students AS student
    WHERE student.is_active IS TRUE
      AND (v_class_name IS NULL OR lower(btrim(student.class_name)) = lower(btrim(v_class_name)))
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

CREATE OR REPLACE FUNCTION public.create_group_assignment_for_class(
  p_title TEXT,
  p_description TEXT,
  p_deadline TIMESTAMPTZ,
  p_document_url TEXT,
  p_rubric TEXT,
  p_class_name TEXT,
  p_group_count INTEGER,
  p_max_students INTEGER
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  v_assignment_id UUID;
  v_group_id UUID;
  v_student_id UUID;
  v_index INTEGER;
  v_student_count INTEGER;
  v_class_name TEXT := NULLIF(BTRIM(p_class_name), '');
BEGIN
  IF NOT public.is_teacher() THEN
    RAISE EXCEPTION 'Teacher role required' USING ERRCODE = '42501';
  END IF;
  IF NULLIF(BTRIM(COALESCE(p_title, '')), '') IS NULL OR LENGTH(p_title) > 200 THEN
    RAISE EXCEPTION 'Assignment title must contain 1–200 characters' USING ERRCODE = '22023';
  END IF;
  IF LENGTH(COALESCE(p_description, '')) > 5000 OR LENGTH(COALESCE(p_rubric, '')) > 20000 THEN
    RAISE EXCEPTION 'Assignment description or rubric is too long' USING ERRCODE = '22023';
  END IF;
  IF v_class_name IS NOT NULL AND LENGTH(v_class_name) > 40 THEN
    RAISE EXCEPTION 'Class name must contain at most 40 characters' USING ERRCODE = '22023';
  END IF;
  IF p_group_count IS NULL OR p_group_count NOT BETWEEN 1 AND 50
     OR p_max_students IS NULL OR p_max_students NOT BETWEEN 1 AND 100 THEN
    RAISE EXCEPTION 'Group size settings are out of range' USING ERRCODE = '22023';
  END IF;

  LOCK TABLE public.students IN SHARE MODE;
  SELECT COUNT(*) INTO v_student_count
  FROM public.students AS student
  WHERE student.is_active IS TRUE
    AND (v_class_name IS NULL OR lower(btrim(student.class_name)) = lower(v_class_name));
  IF v_student_count = 0 THEN
    RAISE EXCEPTION 'Import active students into this class before creating groups' USING ERRCODE = '22023';
  END IF;
  IF v_student_count > p_group_count * p_max_students THEN
    RAISE EXCEPTION 'Group capacity is smaller than the active class size' USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.group_assignments (title, description, deadline, document_url, rubric, class_name)
  VALUES (BTRIM(p_title), COALESCE(p_description, ''), p_deadline, NULLIF(BTRIM(p_document_url), ''), COALESCE(p_rubric, ''), v_class_name)
  RETURNING id INTO v_assignment_id;

  FOR v_index IN 1..p_group_count LOOP
    INSERT INTO public.group_assignment_groups (assignment_id, group_number, group_name)
    VALUES (v_assignment_id, v_index, 'Nhóm ' || v_index)
    RETURNING id INTO v_group_id;

    FOR v_student_id IN
      SELECT student.id
      FROM public.students AS student
      WHERE student.is_active IS TRUE
        AND (v_class_name IS NULL OR lower(btrim(student.class_name)) = lower(v_class_name))
      ORDER BY LOWER(student.full_name), student.id
      LIMIT p_max_students
      OFFSET (v_index - 1) * p_max_students
    LOOP
      INSERT INTO public.group_assignment_members (group_id, student_id)
      VALUES (v_group_id, v_student_id);
    END LOOP;
  END LOOP;

  RETURN v_assignment_id;
END;
$$;

REVOKE ALL ON FUNCTION public.regroup_assignment_students(UUID, INTEGER, INTEGER, BOOLEAN) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.regroup_assignment_students(UUID, INTEGER, INTEGER, BOOLEAN) TO authenticated;
REVOKE ALL ON FUNCTION public.create_group_assignment_for_class(TEXT, TEXT, TIMESTAMPTZ, TEXT, TEXT, TEXT, INTEGER, INTEGER) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_group_assignment_for_class(TEXT, TEXT, TIMESTAMPTZ, TEXT, TEXT, TEXT, INTEGER, INTEGER) TO authenticated;
