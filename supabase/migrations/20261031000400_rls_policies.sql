CREATE OR REPLACE FUNCTION public.is_teacher()
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.role = 'teacher'
  );
$$;

DO $$
DECLARE table_name TEXT;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'profiles','courses','chapters','activities','activity_grading_guides','students','submissions',
    'group_assignments','group_assignment_groups','group_assignment_members',
    'group_submissions','quizzes','quiz_questions','quiz_question_keys','quiz_submissions','messages',
    'chat_settings','course_enrollments','learning_resources'
  ] LOOP
    IF to_regclass(format('public.%I', table_name)) IS NOT NULL THEN
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', table_name);
      EXECUTE format('REVOKE ALL ON public.%I FROM anon', table_name);
      EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO authenticated', table_name);
    END IF;
  END LOOP;
END $$;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT SELECT ON public.courses, public.chapters TO anon;

CREATE POLICY "profiles_read_self_or_teacher" ON public.profiles FOR SELECT TO authenticated
  USING (id = auth.uid() OR public.is_teacher());
CREATE POLICY "profiles_teacher_update" ON public.profiles FOR UPDATE TO authenticated
  USING (public.is_teacher()) WITH CHECK (public.is_teacher());

CREATE POLICY "courses_read_authenticated" ON public.courses FOR SELECT TO authenticated USING (true);
CREATE POLICY "courses_read_public" ON public.courses FOR SELECT TO anon USING (true);
CREATE POLICY "courses_teacher_manage" ON public.courses FOR ALL TO authenticated
  USING (public.is_teacher()) WITH CHECK (public.is_teacher());
CREATE POLICY "chapters_read_authenticated" ON public.chapters FOR SELECT TO authenticated USING (true);
CREATE POLICY "chapters_read_public" ON public.chapters FOR SELECT TO anon USING (true);
CREATE POLICY "chapters_teacher_manage" ON public.chapters FOR ALL TO authenticated
  USING (public.is_teacher()) WITH CHECK (public.is_teacher());
CREATE POLICY "activities_read_authenticated" ON public.activities FOR SELECT TO authenticated USING (true);
CREATE POLICY "activities_teacher_manage" ON public.activities FOR ALL TO authenticated
  USING (public.is_teacher()) WITH CHECK (public.is_teacher());
CREATE POLICY "activity_guides_teacher_manage" ON public.activity_grading_guides FOR ALL TO authenticated
  USING (public.is_teacher()) WITH CHECK (public.is_teacher());

CREATE POLICY "students_teacher_manage" ON public.students FOR ALL TO authenticated
  USING (public.is_teacher()) WITH CHECK (public.is_teacher());
CREATE POLICY "students_read_self" ON public.students FOR SELECT TO authenticated
  USING (auth_user_id = auth.uid());

CREATE POLICY "submissions_teacher_manage" ON public.submissions FOR ALL TO authenticated
  USING (public.is_teacher()) WITH CHECK (public.is_teacher());
CREATE POLICY "submissions_student_read_own" ON public.submissions FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.students s WHERE s.id = student_id AND s.auth_user_id = auth.uid()));
CREATE POLICY "submissions_student_insert_own" ON public.submissions FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.students s WHERE s.id = student_id AND s.auth_user_id = auth.uid())
    AND EXISTS (SELECT 1 FROM public.activities a WHERE a.id = activity_id AND a.status = 'available'
      AND a.accepting_submissions AND (a.deadline IS NULL OR a.deadline >= now()))
  );
CREATE UNIQUE INDEX IF NOT EXISTS idx_submissions_unique_student_activity
  ON public.submissions(student_id, activity_id) WHERE student_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.protect_student_submission()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE real_name TEXT;
BEGIN
  IF NOT public.is_teacher() THEN
    SELECT s.full_name INTO real_name FROM public.students s
      WHERE s.id = NEW.student_id AND s.auth_user_id = auth.uid();
    IF real_name IS NULL THEN RAISE EXCEPTION 'Student identity does not match the authenticated account'; END IF;
    NEW.student_name := real_name;
    NEW.ai_score := NULL;
    NEW.final_score := NULL;
    NEW.ai_feedback := NULL;
    NEW.ai_model_answer := NULL;
    NEW.ai_strengths := NULL;
    NEW.ai_weaknesses := NULL;
    NEW.graded_by := NULL;
    NEW.graded_at := NULL;
    NEW.status := 'pending';
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS submissions_protect_student_insert ON public.submissions;
CREATE TRIGGER submissions_protect_student_insert BEFORE INSERT ON public.submissions
  FOR EACH ROW EXECUTE FUNCTION public.protect_student_submission();

CREATE POLICY "groups_teacher_manage_assignments" ON public.group_assignments FOR ALL TO authenticated
  USING (public.is_teacher()) WITH CHECK (public.is_teacher());
CREATE POLICY "groups_student_read_assignments" ON public.group_assignments FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.group_assignment_groups g
    JOIN public.group_assignment_members m ON m.group_id = g.id
    JOIN public.students s ON s.id = m.student_id
    WHERE g.assignment_id = group_assignments.id AND s.auth_user_id = auth.uid()
  ));
CREATE POLICY "group_structures_teacher_manage" ON public.group_assignment_groups FOR ALL TO authenticated
  USING (public.is_teacher()) WITH CHECK (public.is_teacher());
CREATE POLICY "group_structures_student_read" ON public.group_assignment_groups FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.group_assignment_members m JOIN public.students s ON s.id=m.student_id WHERE m.group_id=group_assignment_groups.id AND s.auth_user_id=auth.uid()));
CREATE POLICY "group_members_teacher_manage" ON public.group_assignment_members FOR ALL TO authenticated
  USING (public.is_teacher()) WITH CHECK (public.is_teacher());
CREATE POLICY "group_members_student_read_own" ON public.group_assignment_members FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.students s WHERE s.id=student_id AND s.auth_user_id=auth.uid()));
CREATE POLICY "group_submissions_teacher_manage" ON public.group_submissions FOR ALL TO authenticated
  USING (public.is_teacher()) WITH CHECK (public.is_teacher());
CREATE POLICY "group_submissions_student_read_member" ON public.group_submissions FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.group_assignment_members m JOIN public.students s ON s.id=m.student_id WHERE m.group_id=group_submissions.group_id AND s.auth_user_id=auth.uid()));
CREATE POLICY "group_submissions_student_insert_member" ON public.group_submissions FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.group_assignment_members m JOIN public.students s ON s.id=m.student_id WHERE m.group_id=group_submissions.group_id AND s.auth_user_id=auth.uid())
    AND EXISTS (SELECT 1 FROM public.group_assignments a WHERE a.id=assignment_id AND (a.deadline IS NULL OR a.deadline >= now())));
CREATE POLICY "group_submissions_student_update_member" ON public.group_submissions FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.group_assignment_members m JOIN public.students s ON s.id=m.student_id WHERE m.group_id=group_submissions.group_id AND s.auth_user_id=auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.group_assignment_members m JOIN public.students s ON s.id=m.student_id WHERE m.group_id=group_submissions.group_id AND s.auth_user_id=auth.uid())
    AND EXISTS (SELECT 1 FROM public.group_assignments a WHERE a.id=assignment_id AND (a.deadline IS NULL OR a.deadline >= now())));
CREATE UNIQUE INDEX IF NOT EXISTS idx_group_submissions_one_per_group
  ON public.group_submissions(group_id) WHERE group_id IS NOT NULL;
CREATE OR REPLACE FUNCTION public.normalize_group_submission()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_group_number INTEGER; v_group_name TEXT;
BEGIN
  SELECT group_number, NULLIF(BTRIM(group_name), '') INTO v_group_number, v_group_name FROM public.group_assignment_groups
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
DROP TRIGGER IF EXISTS group_submissions_normalize ON public.group_submissions;
CREATE TRIGGER group_submissions_normalize BEFORE INSERT OR UPDATE ON public.group_submissions
  FOR EACH ROW EXECUTE FUNCTION public.normalize_group_submission();

CREATE POLICY "quizzes_read_authenticated" ON public.quizzes FOR SELECT TO authenticated USING (true);
CREATE POLICY "quizzes_teacher_manage" ON public.quizzes FOR ALL TO authenticated USING (public.is_teacher()) WITH CHECK (public.is_teacher());
CREATE POLICY "questions_read_authenticated" ON public.quiz_questions FOR SELECT TO authenticated USING (true);
CREATE POLICY "questions_teacher_manage" ON public.quiz_questions FOR ALL TO authenticated USING (public.is_teacher()) WITH CHECK (public.is_teacher());
CREATE POLICY "question_keys_teacher_manage" ON public.quiz_question_keys FOR ALL TO authenticated USING (public.is_teacher()) WITH CHECK (public.is_teacher());
CREATE POLICY "quiz_submissions_teacher_read" ON public.quiz_submissions FOR SELECT TO authenticated USING (public.is_teacher());
CREATE POLICY "quiz_submissions_student_manage_own" ON public.quiz_submissions FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.students s WHERE s.id=student_id AND s.auth_user_id=auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.students s WHERE s.id=student_id AND s.auth_user_id=auth.uid()));

CREATE POLICY "messages_read_authenticated" ON public.messages FOR SELECT TO authenticated USING (true);
CREATE POLICY "messages_insert_own" ON public.messages FOR INSERT TO authenticated WITH CHECK (sender_id = auth.uid());
CREATE POLICY "messages_delete_own_or_teacher" ON public.messages FOR DELETE TO authenticated
  USING (sender_id = auth.uid() OR public.is_teacher());
CREATE OR REPLACE FUNCTION public.set_message_sender_identity()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE p_role TEXT; p_name TEXT;
BEGIN
  SELECT role, full_name INTO p_role, p_name FROM public.profiles WHERE id = auth.uid();
  IF p_role IS NULL THEN RAISE EXCEPTION 'A valid profile is required to send a message'; END IF;
  NEW.sender_id := auth.uid();
  NEW.sender_name := CASE WHEN p_role = 'teacher' THEN 'Giáo viên' ELSE COALESCE(NULLIF(p_name, ''), NEW.sender_name) END;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS messages_set_sender_identity ON public.messages;
CREATE TRIGGER messages_set_sender_identity BEFORE INSERT ON public.messages
  FOR EACH ROW EXECUTE FUNCTION public.set_message_sender_identity();
CREATE POLICY "chat_settings_read_authenticated" ON public.chat_settings FOR SELECT TO authenticated USING (true);
CREATE POLICY "chat_settings_teacher_manage" ON public.chat_settings FOR ALL TO authenticated USING (public.is_teacher()) WITH CHECK (public.is_teacher());
CREATE POLICY "enrollments_teacher_manage" ON public.course_enrollments FOR ALL TO authenticated USING (public.is_teacher()) WITH CHECK (public.is_teacher());
CREATE POLICY "enrollments_student_read_own" ON public.course_enrollments FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.students s WHERE s.id=course_enrollments.student_id AND s.auth_user_id=auth.uid()));

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('class-work', 'class-work', FALSE, 26214400, ARRAY[
  'application/pdf','application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint','application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'image/jpeg','image/png','image/webp','image/gif','audio/mpeg','audio/mp4','audio/wav',
  'video/mp4','video/webm','text/plain','text/csv','application/zip','application/x-zip-compressed'
])
ON CONFLICT (id) DO UPDATE SET public = FALSE, file_size_limit = 26214400, allowed_mime_types = EXCLUDED.allowed_mime_types;
CREATE POLICY "class_work_read_authorized" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'class-work' AND (public.is_teacher()
    OR (storage.foldername(name))[1] = 'chat'
    OR (storage.foldername(name))[2] = auth.uid()::text
    OR EXISTS (SELECT 1 FROM public.group_submissions gs
      JOIN public.group_assignment_members m ON m.group_id=gs.group_id
      JOIN public.students s ON s.id=m.student_id
      WHERE gs.file_url=storage.objects.name AND s.auth_user_id=auth.uid())));
CREATE POLICY "class_work_upload_own" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'class-work' AND (storage.foldername(name))[2] = auth.uid()::text);
CREATE POLICY "class_work_update_own_or_teacher" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'class-work' AND (public.is_teacher() OR (storage.foldername(name))[2] = auth.uid()::text))
  WITH CHECK (bucket_id = 'class-work' AND (public.is_teacher() OR (storage.foldername(name))[2] = auth.uid()::text));
CREATE POLICY "class_work_delete_own_or_teacher" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'class-work' AND (public.is_teacher() OR (storage.foldername(name))[2] = auth.uid()::text));

-- Teacher lesson files are private to authenticated class users. Remove legacy
-- videos-specific policies before adding scoped replacements.
DO $$
DECLARE existing_policy TEXT;
BEGIN
  FOR existing_policy IN
    SELECT policyname FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND (COALESCE(qual, '') || COALESCE(with_check, '')) ILIKE '%videos%'
  LOOP
    EXECUTE format('DROP POLICY %I ON storage.objects', existing_policy);
  END LOOP;
END $$;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('videos', 'videos', FALSE, 104857600, ARRAY[
  'application/pdf','application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint','application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'image/jpeg','image/png','image/webp','audio/mpeg','audio/mp4','audio/wav','video/mp4','video/webm','text/plain','text/csv'
])
ON CONFLICT (id) DO UPDATE SET public = FALSE, file_size_limit = 104857600, allowed_mime_types = EXCLUDED.allowed_mime_types;

CREATE POLICY "videos_read_authenticated" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'videos');
CREATE POLICY "videos_teacher_upload" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'videos' AND public.is_teacher());
CREATE POLICY "videos_teacher_update" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'videos' AND public.is_teacher())
  WITH CHECK (bucket_id = 'videos' AND public.is_teacher());
CREATE POLICY "videos_teacher_delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'videos' AND public.is_teacher());

UPDATE public.activities
SET document_url = split_part(document_url, '/storage/v1/object/public/videos/', 2)
WHERE document_url LIKE '%/storage/v1/object/public/videos/%';
