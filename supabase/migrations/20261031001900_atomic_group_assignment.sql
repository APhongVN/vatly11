-- Create the assignment, its groups and member allocations atomically.
CREATE OR REPLACE FUNCTION public.create_group_assignment_with_groups(
  p_title TEXT,
  p_description TEXT,
  p_deadline TIMESTAMPTZ,
  p_document_url TEXT,
  p_rubric TEXT,
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
  IF p_group_count IS NULL OR p_group_count NOT BETWEEN 1 AND 50
     OR p_max_students IS NULL OR p_max_students NOT BETWEEN 1 AND 100 THEN
    RAISE EXCEPTION 'Group size settings are out of range' USING ERRCODE = '22023';
  END IF;

  SELECT COUNT(*) INTO v_student_count FROM public.students;
  IF v_student_count = 0 THEN
    RAISE EXCEPTION 'Import students before creating groups' USING ERRCODE = '22023';
  END IF;
  IF v_student_count > p_group_count * p_max_students THEN
    RAISE EXCEPTION 'Group capacity is smaller than the class size' USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.group_assignments (title, description, deadline, document_url, rubric)
  VALUES (BTRIM(p_title), COALESCE(p_description, ''), p_deadline, NULLIF(BTRIM(p_document_url), ''), COALESCE(p_rubric, ''))
  RETURNING id INTO v_assignment_id;

  FOR v_index IN 1..p_group_count LOOP
    INSERT INTO public.group_assignment_groups (assignment_id, group_number, group_name)
    VALUES (v_assignment_id, v_index, 'Nhóm ' || v_index)
    RETURNING id INTO v_group_id;

    FOR v_student_id IN
      SELECT s.id
      FROM public.students AS s
      ORDER BY LOWER(s.full_name), s.id
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

REVOKE ALL ON FUNCTION public.create_group_assignment_with_groups(TEXT, TEXT, TIMESTAMPTZ, TEXT, TEXT, INTEGER, INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_group_assignment_with_groups(TEXT, TEXT, TIMESTAMPTZ, TEXT, TEXT, INTEGER, INTEGER) TO authenticated;
