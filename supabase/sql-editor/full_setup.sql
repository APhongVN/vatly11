-- Full VatLy11 schema setup - regenerated with ALL migrations in order.
-- Run ONCE in Supabase SQL Editor on a fresh database. Safe to re-run (idempotent).

-- ===== 20261031000000_initial_schema.sql =====
-- Initial schema for a clean Supabase project. Existing deployments should back up
-- and reconcile their schema before applying this baseline.
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('teacher', 'student')) DEFAULT 'student',
  full_name TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION public.create_student_profile()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  INSERT INTO public.profiles (id, role, full_name)
  VALUES (NEW.id, 'student', COALESCE(NEW.raw_user_meta_data ->> 'full_name', ''))
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created_profile ON auth.users;
CREATE TRIGGER on_auth_user_created_profile
  AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.create_student_profile();

CREATE TABLE IF NOT EXISTS public.courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), title TEXT NOT NULL,
  description TEXT, grade_level INTEGER, subject TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.chapters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), title TEXT NOT NULL, description TEXT,
  course_id UUID REFERENCES public.courses(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.activities (
  id SERIAL PRIMARY KEY, title TEXT NOT NULL, description TEXT NOT NULL DEFAULT '',
  video_url TEXT, document_url TEXT, deadline TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'locked', phase TEXT, type TEXT, duration TEXT,
  deliverable TEXT,
  course_id UUID REFERENCES public.courses(id) ON DELETE SET NULL,
  chapter_id UUID REFERENCES public.chapters(id) ON DELETE SET NULL,
  accepting_submissions BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.activity_grading_guides (
  activity_id INTEGER PRIMARY KEY REFERENCES public.activities(id) ON DELETE CASCADE,
  model_answer TEXT,
  grading_rubric TEXT
);
CREATE TABLE IF NOT EXISTS public.students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), full_name TEXT NOT NULL,
  class_name TEXT NOT NULL DEFAULT '11A1', auth_user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), student_id UUID REFERENCES public.students(id) ON DELETE SET NULL,
  student_name TEXT NOT NULL DEFAULT '', activity_id INTEGER REFERENCES public.activities(id) ON DELETE CASCADE,
  answer TEXT NOT NULL DEFAULT '', answer_text TEXT, file_url TEXT,
  ai_score NUMERIC(3,1) CHECK (ai_score IS NULL OR ai_score BETWEEN 0 AND 10),
  final_score NUMERIC(3,1) CHECK (final_score IS NULL OR final_score BETWEEN 0 AND 10),
  ai_feedback TEXT, ai_model_answer TEXT, ai_strengths TEXT, ai_weaknesses TEXT,
  graded_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL, graded_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'pending', submitted_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.group_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), title TEXT NOT NULL, description TEXT NOT NULL DEFAULT '',
  document_url TEXT, deadline TIMESTAMPTZ, rubric TEXT,
  course_id UUID REFERENCES public.courses(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.group_assignment_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), assignment_id UUID NOT NULL REFERENCES public.group_assignments(id) ON DELETE CASCADE,
  group_number INTEGER NOT NULL, group_name TEXT NOT NULL DEFAULT ''
);
CREATE TABLE IF NOT EXISTS public.group_assignment_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), group_id UUID NOT NULL REFERENCES public.group_assignment_groups(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  UNIQUE(group_id, student_id)
);
CREATE TABLE IF NOT EXISTS public.group_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), assignment_id UUID NOT NULL REFERENCES public.group_assignments(id) ON DELETE CASCADE,
  group_name TEXT NOT NULL, group_id UUID REFERENCES public.group_assignment_groups(id) ON DELETE SET NULL,
  answer TEXT, file_url TEXT, ai_score NUMERIC(3,1), final_score NUMERIC(3,1), ai_feedback TEXT,
  ai_model_answer TEXT, status TEXT NOT NULL DEFAULT 'pending', submitted_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.quizzes (
  id SERIAL PRIMARY KEY, activity_id INTEGER REFERENCES public.activities(id) ON DELETE SET NULL,
  title TEXT NOT NULL, time_limit INTEGER NOT NULL DEFAULT 15,
  course_id UUID REFERENCES public.courses(id) ON DELETE SET NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.quiz_questions (
  id SERIAL PRIMARY KEY, quiz_id INTEGER NOT NULL REFERENCES public.quizzes(id) ON DELETE CASCADE,
  question TEXT NOT NULL, image_url TEXT, options JSONB NOT NULL DEFAULT '[]'
);
CREATE TABLE IF NOT EXISTS public.quiz_question_keys (
  question_id INTEGER PRIMARY KEY REFERENCES public.quiz_questions(id) ON DELETE CASCADE,
  correct_option INTEGER NOT NULL CHECK (correct_option BETWEEN 0 AND 3),
  explanation TEXT
);
CREATE TABLE IF NOT EXISTS public.quiz_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), quiz_id INTEGER NOT NULL REFERENCES public.quizzes(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  score NUMERIC(5,2) NOT NULL DEFAULT 0, created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), sender_id UUID DEFAULT auth.uid() REFERENCES public.profiles(id) ON DELETE SET NULL,
  sender_name TEXT NOT NULL, content TEXT NOT NULL DEFAULT '', attachment_url TEXT,
  attachment_name TEXT, attachment_type TEXT, course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.chat_settings (
  id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1), is_muted BOOLEAN NOT NULL DEFAULT FALSE,
  muted_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL
);
INSERT INTO public.chat_settings(id) VALUES (1) ON CONFLICT (id) DO NOTHING;
CREATE TABLE IF NOT EXISTS public.course_enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE,
  student_id UUID REFERENCES public.students(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'student' CHECK (role IN ('teacher', 'student')),
  enrolled_at TIMESTAMPTZ NOT NULL DEFAULT now(), UNIQUE(course_id, student_id)
);

CREATE INDEX IF NOT EXISTS idx_students_name ON public.students(full_name);
CREATE INDEX IF NOT EXISTS idx_submissions_student_activity ON public.submissions(student_id, activity_id);
CREATE INDEX IF NOT EXISTS idx_submissions_status_date ON public.submissions(status, submitted_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_created ON public.messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_group_members_student ON public.group_assignment_members(student_id);

-- ===== 20261031000100_create_chapters.sql =====
CREATE TABLE IF NOT EXISTS public.chapters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  course_id UUID REFERENCES public.courses(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.activities
  ADD COLUMN IF NOT EXISTS chapter_id UUID REFERENCES public.chapters(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_activities_chapter_id ON public.activities(chapter_id);

-- ===== 20261031000200_create_courses.sql =====
CREATE TABLE IF NOT EXISTS public.courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  grade_level INTEGER,
  subject TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.activities
  ADD COLUMN IF NOT EXISTS course_id UUID REFERENCES public.courses(id) ON DELETE SET NULL;
ALTER TABLE public.chapters
  ADD COLUMN IF NOT EXISTS course_id UUID REFERENCES public.courses(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS public.course_enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE,
  student_id UUID REFERENCES public.students(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'student' CHECK (role IN ('teacher', 'student')),
  enrolled_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(course_id, student_id)
);
CREATE INDEX IF NOT EXISTS idx_activities_course_id ON public.activities(course_id);
CREATE INDEX IF NOT EXISTS idx_chapters_course_id ON public.chapters(course_id);
CREATE INDEX IF NOT EXISTS idx_course_enrollments_course_id ON public.course_enrollments(course_id);
CREATE INDEX IF NOT EXISTS idx_course_enrollments_student_id ON public.course_enrollments(student_id);

-- ===== 20261031000300_schema_updates.sql =====
-- Compatibility additions for the initial schema. Keep all additions idempotent.
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS auth_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.submissions ADD COLUMN IF NOT EXISTS student_id UUID REFERENCES public.students(id) ON DELETE SET NULL;
ALTER TABLE public.submissions ADD COLUMN IF NOT EXISTS answer_text TEXT;
ALTER TABLE public.submissions ADD COLUMN IF NOT EXISTS final_score NUMERIC(3,1);
ALTER TABLE public.submissions ADD COLUMN IF NOT EXISTS graded_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL;
ALTER TABLE public.submissions ADD COLUMN IF NOT EXISTS graded_at TIMESTAMPTZ;
ALTER TABLE public.activities ADD COLUMN IF NOT EXISTS accepting_submissions BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS sender_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL DEFAULT auth.uid();
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE;
ALTER TABLE public.group_submissions ADD COLUMN IF NOT EXISTS group_id UUID REFERENCES public.group_assignment_groups(id) ON DELETE SET NULL;
ALTER TABLE public.group_submissions ADD COLUMN IF NOT EXISTS ai_score NUMERIC(3,1);
ALTER TABLE public.group_submissions ADD COLUMN IF NOT EXISTS ai_feedback TEXT;
ALTER TABLE public.group_submissions ADD COLUMN IF NOT EXISTS ai_model_answer TEXT;
ALTER TABLE public.group_submissions ADD COLUMN IF NOT EXISTS final_score NUMERIC(3,1);
ALTER TABLE public.quizzes ADD COLUMN IF NOT EXISTS course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE;
ALTER TABLE public.group_assignments ADD COLUMN IF NOT EXISTS course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE;
ALTER TABLE public.chat_settings ADD COLUMN IF NOT EXISTS muted_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_submissions_student_id ON public.submissions(student_id);
CREATE INDEX IF NOT EXISTS idx_submissions_activity_id ON public.submissions(activity_id);
CREATE INDEX IF NOT EXISTS idx_submissions_status ON public.submissions(status);
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON public.messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON public.messages(created_at DESC);

-- ===== 20261031000400_rls_policies.sql =====
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

DROP POLICY IF EXISTS "profiles_read_self_or_teacher" ON public.profiles;
CREATE POLICY "profiles_read_self_or_teacher" ON public.profiles FOR SELECT TO authenticated
  USING (id = auth.uid() OR public.is_teacher());
DROP POLICY IF EXISTS "profiles_teacher_update" ON public.profiles;
CREATE POLICY "profiles_teacher_update" ON public.profiles FOR UPDATE TO authenticated
  USING (public.is_teacher()) WITH CHECK (public.is_teacher());

DROP POLICY IF EXISTS "courses_read_authenticated" ON public.courses;
CREATE POLICY "courses_read_authenticated" ON public.courses FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "courses_read_public" ON public.courses;
CREATE POLICY "courses_read_public" ON public.courses FOR SELECT TO anon USING (true);
DROP POLICY IF EXISTS "courses_teacher_manage" ON public.courses;
CREATE POLICY "courses_teacher_manage" ON public.courses FOR ALL TO authenticated
  USING (public.is_teacher()) WITH CHECK (public.is_teacher());
DROP POLICY IF EXISTS "chapters_read_authenticated" ON public.chapters;
CREATE POLICY "chapters_read_authenticated" ON public.chapters FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "chapters_read_public" ON public.chapters;
CREATE POLICY "chapters_read_public" ON public.chapters FOR SELECT TO anon USING (true);
DROP POLICY IF EXISTS "chapters_teacher_manage" ON public.chapters;
CREATE POLICY "chapters_teacher_manage" ON public.chapters FOR ALL TO authenticated
  USING (public.is_teacher()) WITH CHECK (public.is_teacher());
DROP POLICY IF EXISTS "activities_read_authenticated" ON public.activities;
CREATE POLICY "activities_read_authenticated" ON public.activities FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "activities_teacher_manage" ON public.activities;
CREATE POLICY "activities_teacher_manage" ON public.activities FOR ALL TO authenticated
  USING (public.is_teacher()) WITH CHECK (public.is_teacher());
DROP POLICY IF EXISTS "activity_guides_teacher_manage" ON public.activity_grading_guides;
CREATE POLICY "activity_guides_teacher_manage" ON public.activity_grading_guides FOR ALL TO authenticated
  USING (public.is_teacher()) WITH CHECK (public.is_teacher());

DROP POLICY IF EXISTS "students_teacher_manage" ON public.students;
CREATE POLICY "students_teacher_manage" ON public.students FOR ALL TO authenticated
  USING (public.is_teacher()) WITH CHECK (public.is_teacher());
DROP POLICY IF EXISTS "students_read_self" ON public.students;
CREATE POLICY "students_read_self" ON public.students FOR SELECT TO authenticated
  USING (auth_user_id = auth.uid());

DROP POLICY IF EXISTS "submissions_teacher_manage" ON public.submissions;
CREATE POLICY "submissions_teacher_manage" ON public.submissions FOR ALL TO authenticated
  USING (public.is_teacher()) WITH CHECK (public.is_teacher());
DROP POLICY IF EXISTS "submissions_student_read_own" ON public.submissions;
CREATE POLICY "submissions_student_read_own" ON public.submissions FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.students s WHERE s.id = student_id AND s.auth_user_id = auth.uid()));
DROP POLICY IF EXISTS "submissions_student_insert_own" ON public.submissions;
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

DROP POLICY IF EXISTS "groups_teacher_manage_assignments" ON public.group_assignments;
CREATE POLICY "groups_teacher_manage_assignments" ON public.group_assignments FOR ALL TO authenticated
  USING (public.is_teacher()) WITH CHECK (public.is_teacher());
DROP POLICY IF EXISTS "groups_student_read_assignments" ON public.group_assignments;
CREATE POLICY "groups_student_read_assignments" ON public.group_assignments FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.group_assignment_groups g
    JOIN public.group_assignment_members m ON m.group_id = g.id
    JOIN public.students s ON s.id = m.student_id
    WHERE g.assignment_id = group_assignments.id AND s.auth_user_id = auth.uid()
  ));
DROP POLICY IF EXISTS "group_structures_teacher_manage" ON public.group_assignment_groups;
CREATE POLICY "group_structures_teacher_manage" ON public.group_assignment_groups FOR ALL TO authenticated
  USING (public.is_teacher()) WITH CHECK (public.is_teacher());
DROP POLICY IF EXISTS "group_structures_student_read" ON public.group_assignment_groups;
CREATE POLICY "group_structures_student_read" ON public.group_assignment_groups FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.group_assignment_members m JOIN public.students s ON s.id=m.student_id WHERE m.group_id=group_assignment_groups.id AND s.auth_user_id=auth.uid()));
DROP POLICY IF EXISTS "group_members_teacher_manage" ON public.group_assignment_members;
CREATE POLICY "group_members_teacher_manage" ON public.group_assignment_members FOR ALL TO authenticated
  USING (public.is_teacher()) WITH CHECK (public.is_teacher());
DROP POLICY IF EXISTS "group_members_student_read_own" ON public.group_assignment_members;
CREATE POLICY "group_members_student_read_own" ON public.group_assignment_members FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.students s WHERE s.id=student_id AND s.auth_user_id=auth.uid()));
DROP POLICY IF EXISTS "group_submissions_teacher_manage" ON public.group_submissions;
CREATE POLICY "group_submissions_teacher_manage" ON public.group_submissions FOR ALL TO authenticated
  USING (public.is_teacher()) WITH CHECK (public.is_teacher());
DROP POLICY IF EXISTS "group_submissions_student_read_member" ON public.group_submissions;
CREATE POLICY "group_submissions_student_read_member" ON public.group_submissions FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.group_assignment_members m JOIN public.students s ON s.id=m.student_id WHERE m.group_id=group_submissions.group_id AND s.auth_user_id=auth.uid()));
DROP POLICY IF EXISTS "group_submissions_student_insert_member" ON public.group_submissions;
CREATE POLICY "group_submissions_student_insert_member" ON public.group_submissions FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.group_assignment_members m JOIN public.students s ON s.id=m.student_id WHERE m.group_id=group_submissions.group_id AND s.auth_user_id=auth.uid())
    AND EXISTS (SELECT 1 FROM public.group_assignments a WHERE a.id=assignment_id AND (a.deadline IS NULL OR a.deadline >= now())));
DROP POLICY IF EXISTS "group_submissions_student_update_member" ON public.group_submissions;
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

DROP POLICY IF EXISTS "quizzes_read_authenticated" ON public.quizzes;
CREATE POLICY "quizzes_read_authenticated" ON public.quizzes FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "quizzes_teacher_manage" ON public.quizzes;
CREATE POLICY "quizzes_teacher_manage" ON public.quizzes FOR ALL TO authenticated USING (public.is_teacher()) WITH CHECK (public.is_teacher());
DROP POLICY IF EXISTS "questions_read_authenticated" ON public.quiz_questions;
CREATE POLICY "questions_read_authenticated" ON public.quiz_questions FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "questions_teacher_manage" ON public.quiz_questions;
CREATE POLICY "questions_teacher_manage" ON public.quiz_questions FOR ALL TO authenticated USING (public.is_teacher()) WITH CHECK (public.is_teacher());
DROP POLICY IF EXISTS "question_keys_teacher_manage" ON public.quiz_question_keys;
CREATE POLICY "question_keys_teacher_manage" ON public.quiz_question_keys FOR ALL TO authenticated USING (public.is_teacher()) WITH CHECK (public.is_teacher());
DROP POLICY IF EXISTS "quiz_submissions_teacher_read" ON public.quiz_submissions;
CREATE POLICY "quiz_submissions_teacher_read" ON public.quiz_submissions FOR SELECT TO authenticated USING (public.is_teacher());
DROP POLICY IF EXISTS "quiz_submissions_student_manage_own" ON public.quiz_submissions;
CREATE POLICY "quiz_submissions_student_manage_own" ON public.quiz_submissions FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.students s WHERE s.id=student_id AND s.auth_user_id=auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.students s WHERE s.id=student_id AND s.auth_user_id=auth.uid()));

DROP POLICY IF EXISTS "messages_read_authenticated" ON public.messages;
CREATE POLICY "messages_read_authenticated" ON public.messages FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "messages_insert_own" ON public.messages;
CREATE POLICY "messages_insert_own" ON public.messages FOR INSERT TO authenticated WITH CHECK (sender_id = auth.uid());
DROP POLICY IF EXISTS "messages_delete_own_or_teacher" ON public.messages;
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
DROP POLICY IF EXISTS "chat_settings_read_authenticated" ON public.chat_settings;
CREATE POLICY "chat_settings_read_authenticated" ON public.chat_settings FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "chat_settings_teacher_manage" ON public.chat_settings;
CREATE POLICY "chat_settings_teacher_manage" ON public.chat_settings FOR ALL TO authenticated USING (public.is_teacher()) WITH CHECK (public.is_teacher());
DROP POLICY IF EXISTS "enrollments_teacher_manage" ON public.course_enrollments;
CREATE POLICY "enrollments_teacher_manage" ON public.course_enrollments FOR ALL TO authenticated USING (public.is_teacher()) WITH CHECK (public.is_teacher());
DROP POLICY IF EXISTS "enrollments_student_read_own" ON public.course_enrollments;
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
DROP POLICY IF EXISTS "class_work_read_authorized" ON storage.objects;
CREATE POLICY "class_work_read_authorized" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'class-work' AND (public.is_teacher()
    OR (storage.foldername(name))[1] = 'chat'
    OR (storage.foldername(name))[2] = auth.uid()::text
    OR EXISTS (SELECT 1 FROM public.group_submissions gs
      JOIN public.group_assignment_members m ON m.group_id=gs.group_id
      JOIN public.students s ON s.id=m.student_id
      WHERE gs.file_url=storage.objects.name AND s.auth_user_id=auth.uid())));
DROP POLICY IF EXISTS "class_work_upload_own" ON storage.objects;
CREATE POLICY "class_work_upload_own" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'class-work' AND (storage.foldername(name))[2] = auth.uid()::text);
DROP POLICY IF EXISTS "class_work_update_own_or_teacher" ON storage.objects;
CREATE POLICY "class_work_update_own_or_teacher" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'class-work' AND (public.is_teacher() OR (storage.foldername(name))[2] = auth.uid()::text))
  WITH CHECK (bucket_id = 'class-work' AND (public.is_teacher() OR (storage.foldername(name))[2] = auth.uid()::text));
DROP POLICY IF EXISTS "class_work_delete_own_or_teacher" ON storage.objects;
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

DROP POLICY IF EXISTS "videos_read_activity_document" ON storage.objects;
CREATE POLICY "videos_read_activity_document" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'videos' AND (public.is_teacher() OR EXISTS (
    SELECT 1 FROM public.activities a
    WHERE a.document_url = storage.objects.name AND a.status = 'available'
  )));
DROP POLICY IF EXISTS "videos_teacher_upload" ON storage.objects;
CREATE POLICY "videos_teacher_upload" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'videos' AND public.is_teacher());
DROP POLICY IF EXISTS "videos_teacher_update" ON storage.objects;
CREATE POLICY "videos_teacher_update" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'videos' AND public.is_teacher())
  WITH CHECK (bucket_id = 'videos' AND public.is_teacher());
DROP POLICY IF EXISTS "videos_teacher_delete" ON storage.objects;
CREATE POLICY "videos_teacher_delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'videos' AND public.is_teacher());

UPDATE public.activities
SET document_url = split_part(document_url, '/storage/v1/object/public/videos/', 2)
WHERE document_url LIKE '%/storage/v1/object/public/videos/%';

-- ===== 20261031000500_rls_enabled.sql =====
-- Guard against the old demo migration that disabled Row Level Security.
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chapters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_assignment_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_assignment_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_enrollments ENABLE ROW LEVEL SECURITY;

-- ===== 20261031000600_seed_data.sql =====
-- Seed only curriculum metadata; teachers can add, edit, publish and attach the real materials in the UI.
-- Activity IDs 9, 10 and 11 remain merged into the single experiment activity 8.
INSERT INTO public.courses (id, title, description, grade_level, subject)
VALUES ('11111111-1111-4111-8111-111111111111', 'Vật lí 11', 'Chương trình học Vật lí lớp 11.', 11, 'Vật lí')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.chapters (id, title, description, course_id)
VALUES ('44444444-4444-4444-8444-444444444444', 'Chuyên đề Tụ điện', 'Không gian học tập tổng thể cho chuỗi hoạt động trước, trong và sau giờ học.', '11111111-1111-4111-8111-111111111111')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.activities
  (id, title, description, phase, type, duration, status, deliverable, course_id, chapter_id)
VALUES
  (1,'Xác định vấn đề bài học','Quan sát tình huống tụ điện nạp và phóng điện; nêu dự đoán ban đầu.','Trước lớp','Bài giảng','8–10 phút','locked','Câu hỏi vấn đề và giải thích ban đầu','11111111-1111-4111-8111-111111111111','44444444-4444-4444-8444-444444444444'),
  (2,'Microteaching – video bài giảng ngắn','Bốn video ngắn: ứng dụng, cấu tạo, điện dung và năng lượng tụ điện.','Trước lớp','Bài giảng','20–25 phút','locked','Bốn video và checkpoint','11111111-1111-4111-8111-111111111111','44444444-4444-4444-8444-444444444444'),
  (3,'Đề xuất dự đoán và giả thuyết','Nêu giả thuyết về Q–U và ảnh hưởng của S, d, εr đến điện dung.','Trước lớp','Bài tập','10–12 phút','locked','Bốn giả thuyết cá nhân','11111111-1111-4111-8111-111111111111','44444444-4444-4444-8444-444444444444'),
  (4,'Khám phá bằng phòng thí nghiệm ảo','Khảo sát ảnh hưởng của diện tích, khoảng cách và điện môi; lập đồ thị Q–U.','Trước lớp','Thí nghiệm','30–40 phút','available','Sổ tay điều tra và dữ liệu đo','11111111-1111-4111-8111-111111111111','44444444-4444-4444-8444-444444444444'),
  (5,'Quan sát và phân tích thí nghiệm thật','Đối chiếu dự đoán với bằng chứng từ thí nghiệm nạp và phóng tụ điện.','Trước lớp','Bài giảng','8–10 phút','locked','Báo cáo Prediction–Evidence–Revision','11111111-1111-4111-8111-111111111111','44444444-4444-4444-8444-444444444444'),
  (6,'Kiểm tra mức sẵn sàng trước giờ học','Bài kiểm tra ngắn về cấu tạo, điện tích, điện dung, ghép tụ và câu hỏi còn băn khoăn.','Trước lớp','Bài tập','10 phút','locked','Bài kiểm tra 10 câu và Muddy Point','11111111-1111-4111-8111-111111111111','44444444-4444-4444-8444-444444444444'),
  (7,'Kích hoạt kiến thức và đối chiếu dự đoán','Bình chọn cá nhân, thảo luận theo cặp và đối chiếu câu trả lời.','Trên lớp','Bài tập','10–12 phút','locked','Bình chọn và lập luận sau thảo luận','11111111-1111-4111-8111-111111111111','44444444-4444-4444-8444-444444444444'),
  (8,'Các thí nghiệm liên quan đến tụ điện','Hoạt động tích hợp: nạp/phóng; điện dung; ghép tụ; năng lượng điện trường.','Trên lớp','Thí nghiệm','60–80 phút','locked','Phiếu học tập thực nghiệm và mô hình hóa','11111111-1111-4111-8111-111111111111','44444444-4444-4444-8444-444444444444'),
  (12,'Luyện tập – củng cố – vận dụng gần','Thử thách 16 câu và bài tập phân hóa theo bốn mức độ.','Trên lớp','Bài tập','20 phút','locked','Capacitor Challenge và bài tập phân hóa','11111111-1111-4111-8111-111111111111','44444444-4444-4444-8444-444444444444'),
  (13,'Vận dụng xa và thiết kế dự án','Thiết kế giải pháp tích trữ năng lượng, tính toán và bảo vệ phương án.','Sau lớp','Dự án','1–2 tuần','locked','Báo cáo hoặc poster/video dự án','11111111-1111-4111-8111-111111111111','44444444-4444-4444-8444-444444444444'),
  (14,'Phản tư – luyện tập giãn cách – chuyển giao','Tự đánh giá sự thay đổi nhận thức và làm bài tập chuyển giao sau một tuần.','Sau lớp','Phản tư','15–20 phút + mở trễ','locked','Bốn câu phản tư và tám bài tập','11111111-1111-4111-8111-111111111111','44444444-4444-4444-8444-444444444444')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.activity_grading_guides (activity_id, grading_rubric) VALUES
  (1,'Nêu quan sát, giải thích năng lượng tích trữ và đặt câu hỏi nghiên cứu.'),
  (2,'Hoàn thành checkpoint về ứng dụng, cấu tạo, quan hệ Q–U, các yếu tố ảnh hưởng C và năng lượng.'),
  (3,'Đánh giá xu hướng, đồ thị dự kiến và căn cứ vật lí cho Q–U, C–S, C–d, C–εr.'),
  (4,'3đ dữ liệu đo; 4đ đồ thị Q=f(U) và hệ số góc; 3đ kết luận tác động của S, d, εr.'),
  (5,'Nêu bằng chứng quan sát, đối chiếu dự đoán và giải thích phóng điện qua tải.'),
  (6,'Mỗi câu đúng 1 điểm; ghi nhận câu hỏi còn vướng để giáo viên xử lý đầu giờ.'),
  (7,'Đánh giá lập luận ban đầu và sự thay đổi câu trả lời sau khi thảo luận cặp.'),
  (8,'Mỗi nội dung 2.5đ: nạp/phóng; C=ε₀εrS/d; quy tắc ghép; năng lượng W=1/2QU.'),
  (12,'Hoàn thành câu hỏi củng cố và bài phân hóa; phân biệt tụ còn nối nguồn với tụ đã ngắt nguồn.'),
  (13,'Đánh giá kiến thức, tính toán, so sánh phương án, tính khả thi và trình bày sơ đồ.'),
  (14,'Đánh giá phản tư dựa trên bằng chứng và hoàn thành bài chuyển giao sau một tuần.')
ON CONFLICT (activity_id) DO NOTHING;
SELECT setval(pg_get_serial_sequence('public.activities','id'), GREATEST(COALESCE((SELECT MAX(id) FROM public.activities), 1), 1), true);

-- ===== 20261031000700_learning_resource_library.sql =====
-- Teacher managed library for reusable files and external learning links.
CREATE TABLE IF NOT EXISTS public.learning_resources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  resource_type TEXT NOT NULL CHECK (resource_type IN ('file', 'link')),
  category TEXT NOT NULL DEFAULT 'Khác',
  tags TEXT[] NOT NULL DEFAULT '{}',
  storage_path TEXT UNIQUE,
  source_url TEXT,
  mime_type TEXT,
  file_size BIGINT,
  course_id UUID REFERENCES public.courses(id) ON DELETE SET NULL,
  chapter_id UUID REFERENCES public.chapters(id) ON DELETE SET NULL,
  activity_id INTEGER REFERENCES public.activities(id) ON DELETE SET NULL,
  is_published BOOLEAN NOT NULL DEFAULT FALSE,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL DEFAULT auth.uid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT resource_location_check CHECK (
    (resource_type = 'file' AND storage_path IS NOT NULL AND source_url IS NULL)
    OR (resource_type = 'link' AND source_url IS NOT NULL AND storage_path IS NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_learning_resources_activity ON public.learning_resources(activity_id, is_published, display_order);
CREATE INDEX IF NOT EXISTS idx_learning_resources_course_chapter ON public.learning_resources(course_id, chapter_id);
CREATE INDEX IF NOT EXISTS idx_learning_resources_category ON public.learning_resources(category);
CREATE INDEX IF NOT EXISTS idx_learning_resources_created_at ON public.learning_resources(created_at DESC);

ALTER TABLE public.learning_resources ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Published resources are readable" ON public.learning_resources;
CREATE POLICY "Published resources are readable" ON public.learning_resources
  FOR SELECT USING (is_published = TRUE);

DROP POLICY IF EXISTS "Teachers read all resources" ON public.learning_resources;
CREATE POLICY "Teachers read all resources" ON public.learning_resources
  FOR SELECT TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'teacher');

DROP POLICY IF EXISTS "Teachers insert resources" ON public.learning_resources;
CREATE POLICY "Teachers insert resources" ON public.learning_resources
  FOR INSERT TO authenticated
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') = 'teacher');

DROP POLICY IF EXISTS "Teachers update resources" ON public.learning_resources;
CREATE POLICY "Teachers update resources" ON public.learning_resources
  FOR UPDATE TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'teacher')
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') = 'teacher');

DROP POLICY IF EXISTS "Teachers delete resources" ON public.learning_resources;
CREATE POLICY "Teachers delete resources" ON public.learning_resources
  FOR DELETE TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'teacher');

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('learning-resources', 'learning-resources', FALSE, 104857600, NULL)
ON CONFLICT (id) DO UPDATE SET public = FALSE, file_size_limit = 104857600, allowed_mime_types = NULL;

DROP POLICY IF EXISTS "Published resource files are readable" ON storage.objects;
CREATE POLICY "Published resource files are readable" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'learning-resources'
    AND EXISTS (
      SELECT 1 FROM public.learning_resources r
      WHERE r.storage_path = storage.objects.name AND r.is_published = TRUE
    )
  );

DROP POLICY IF EXISTS "Teachers upload learning resource files" ON storage.objects;
CREATE POLICY "Teachers upload learning resource files" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'learning-resources'
    AND (auth.jwt() -> 'app_metadata' ->> 'role') = 'teacher'
  );

DROP POLICY IF EXISTS "Teachers update learning resource files" ON storage.objects;
CREATE POLICY "Teachers update learning resource files" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'learning-resources'
    AND (auth.jwt() -> 'app_metadata' ->> 'role') = 'teacher'
  )
  WITH CHECK (
    bucket_id = 'learning-resources'
    AND (auth.jwt() -> 'app_metadata' ->> 'role') = 'teacher'
  );

DROP POLICY IF EXISTS "Teachers delete learning resource files" ON storage.objects;
CREATE POLICY "Teachers delete learning resource files" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'learning-resources'
    AND (auth.jwt() -> 'app_metadata' ->> 'role') = 'teacher'
  );
DROP POLICY IF EXISTS "Teachers read learning resource files" ON storage.objects;
CREATE POLICY "Teachers read learning resource files" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'learning-resources'
    AND (auth.jwt() -> 'app_metadata' ->> 'role') = 'teacher'
  );
GRANT SELECT, INSERT, UPDATE, DELETE ON public.learning_resources TO authenticated;

-- ===== 20261031000800_chat_attachments.sql =====
ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS attachment_url TEXT,
  ADD COLUMN IF NOT EXISTS attachment_name TEXT,
  ADD COLUMN IF NOT EXISTS attachment_type TEXT;

CREATE INDEX IF NOT EXISTS idx_messages_created_at_id ON public.messages(created_at DESC, id DESC);

-- ===== 20261031000900_learning_resource_policies.sql =====
ALTER TABLE public.learning_resources ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Published resources are readable" ON public.learning_resources;
DROP POLICY IF EXISTS "Teachers read all resources" ON public.learning_resources;
DROP POLICY IF EXISTS "Teachers insert resources" ON public.learning_resources;
DROP POLICY IF EXISTS "Teachers update resources" ON public.learning_resources;
DROP POLICY IF EXISTS "Teachers delete resources" ON public.learning_resources;
DROP POLICY IF EXISTS "resources_read_published_or_teacher" ON public.learning_resources;
CREATE POLICY "resources_read_published_or_teacher" ON public.learning_resources FOR SELECT TO authenticated
  USING (is_published OR public.is_teacher());
DROP POLICY IF EXISTS "resources_teacher_insert" ON public.learning_resources;
CREATE POLICY "resources_teacher_insert" ON public.learning_resources FOR INSERT TO authenticated
  WITH CHECK (public.is_teacher());
DROP POLICY IF EXISTS "resources_teacher_update" ON public.learning_resources;
CREATE POLICY "resources_teacher_update" ON public.learning_resources FOR UPDATE TO authenticated
  USING (public.is_teacher()) WITH CHECK (public.is_teacher());
DROP POLICY IF EXISTS "resources_teacher_delete" ON public.learning_resources;
CREATE POLICY "resources_teacher_delete" ON public.learning_resources FOR DELETE TO authenticated
  USING (public.is_teacher());

DROP POLICY IF EXISTS "Teachers upload learning resource files" ON storage.objects;
DROP POLICY IF EXISTS "Teachers update learning resource files" ON storage.objects;
DROP POLICY IF EXISTS "Teachers delete learning resource files" ON storage.objects;
DROP POLICY IF EXISTS "Teachers read learning resource files" ON storage.objects;
DROP POLICY IF EXISTS "Published resource files are readable" ON storage.objects;
DROP POLICY IF EXISTS "learning_resource_objects_read" ON storage.objects;
CREATE POLICY "learning_resource_objects_read" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'learning-resources' AND (public.is_teacher() OR EXISTS (
    SELECT 1 FROM public.learning_resources r WHERE r.storage_path = storage.objects.name AND r.is_published
  )));
DROP POLICY IF EXISTS "learning_resource_objects_insert" ON storage.objects;
CREATE POLICY "learning_resource_objects_insert" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'learning-resources' AND public.is_teacher());
DROP POLICY IF EXISTS "learning_resource_objects_update" ON storage.objects;
CREATE POLICY "learning_resource_objects_update" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'learning-resources' AND public.is_teacher())
  WITH CHECK (bucket_id = 'learning-resources' AND public.is_teacher());
DROP POLICY IF EXISTS "learning_resource_objects_delete" ON storage.objects;
CREATE POLICY "learning_resource_objects_delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'learning-resources' AND public.is_teacher());

-- ===== 20261031001000_api_rate_limits.sql =====
CREATE TABLE IF NOT EXISTS public.api_rate_limits (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  bucket TEXT NOT NULL,
  window_started_at TIMESTAMPTZ NOT NULL,
  hit_count INTEGER NOT NULL CHECK (hit_count > 0),
  PRIMARY KEY (user_id, bucket)
);
ALTER TABLE public.api_rate_limits ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.api_rate_limits FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.consume_api_rate_limit(p_bucket TEXT, p_limit INTEGER, p_window_seconds INTEGER)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  current_user_id UUID := auth.uid();
  hits INTEGER;
  started TIMESTAMPTZ;
  v_current_time TIMESTAMPTZ := now();
BEGIN
  IF current_user_id IS NULL OR p_bucket !~ '^[a-z-]{1,32}$'
    OR p_limit < 1 OR p_limit > 300 OR p_window_seconds < 1 OR p_window_seconds > 3600 THEN
    RETURN FALSE;
  END IF;

  INSERT INTO public.api_rate_limits(user_id, bucket, window_started_at, hit_count)
  VALUES (current_user_id, p_bucket, v_current_time, 1)
  ON CONFLICT (user_id, bucket) DO UPDATE SET
    window_started_at = CASE
      WHEN EXCLUDED.window_started_at >= public.api_rate_limits.window_started_at + (p_window_seconds * interval '1 second')
      THEN EXCLUDED.window_started_at ELSE public.api_rate_limits.window_started_at END,
    hit_count = CASE
      WHEN EXCLUDED.window_started_at >= public.api_rate_limits.window_started_at + (p_window_seconds * interval '1 second')
      THEN 1 ELSE public.api_rate_limits.hit_count + 1 END
  RETURNING hit_count, window_started_at INTO hits, started;

  RETURN v_current_time < started + (p_window_seconds * interval '1 second') AND hits <= p_limit;
END;
$$;
REVOKE ALL ON FUNCTION public.consume_api_rate_limit(TEXT, INTEGER, INTEGER) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.consume_api_rate_limit(TEXT, INTEGER, INTEGER) TO authenticated;

-- ===== 20261031001100_named_groups.sql =====
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

-- ===== 20261031001200_publish_curriculum_activities.sql =====
UPDATE public.activities
SET status = 'available'
WHERE id IN (1,2,3,4,5,6,7,8,12,13,14);

-- ===== 20261031001300_private_activity_data.sql =====
DROP POLICY IF EXISTS "activities_read_public" ON public.activities;
REVOKE SELECT ON public.activities FROM anon;

-- ===== 20261031001400_protect_answer_keys.sql =====
-- Keep model answers, grading rubrics, quiz keys and explanations out of student-readable tables.
CREATE TABLE IF NOT EXISTS public.activity_grading_guides (
  activity_id INTEGER PRIMARY KEY REFERENCES public.activities(id) ON DELETE CASCADE,
  model_answer TEXT,
  grading_rubric TEXT
);
CREATE TABLE IF NOT EXISTS public.quiz_question_keys (
  question_id INTEGER PRIMARY KEY REFERENCES public.quiz_questions(id) ON DELETE CASCADE,
  correct_option INTEGER NOT NULL CHECK (correct_option BETWEEN 0 AND 3),
  explanation TEXT
);

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='activities' AND column_name='model_answer') THEN
    EXECUTE 'INSERT INTO public.activity_grading_guides(activity_id, model_answer) SELECT id, model_answer FROM public.activities WHERE model_answer IS NOT NULL ON CONFLICT(activity_id) DO UPDATE SET model_answer=EXCLUDED.model_answer';
    ALTER TABLE public.activities DROP COLUMN model_answer;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='activities' AND column_name='grading_rubric') THEN
    EXECUTE 'INSERT INTO public.activity_grading_guides(activity_id, grading_rubric) SELECT id, grading_rubric FROM public.activities WHERE grading_rubric IS NOT NULL ON CONFLICT(activity_id) DO UPDATE SET grading_rubric=EXCLUDED.grading_rubric';
    ALTER TABLE public.activities DROP COLUMN grading_rubric;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='quiz_questions' AND column_name='correct_option') THEN
    EXECUTE 'INSERT INTO public.quiz_question_keys(question_id, correct_option) SELECT id, correct_option FROM public.quiz_questions ON CONFLICT(question_id) DO UPDATE SET correct_option=EXCLUDED.correct_option';
    ALTER TABLE public.quiz_questions DROP COLUMN correct_option;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='quiz_questions' AND column_name='explanation') THEN
    EXECUTE 'INSERT INTO public.quiz_question_keys(question_id, correct_option, explanation) SELECT q.id, COALESCE(k.correct_option,0), q.explanation FROM public.quiz_questions q LEFT JOIN public.quiz_question_keys k ON k.question_id=q.id WHERE true ON CONFLICT(question_id) DO UPDATE SET explanation=EXCLUDED.explanation';
    ALTER TABLE public.quiz_questions DROP COLUMN explanation;
  END IF;
END $$;

ALTER TABLE public.activity_grading_guides ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_question_keys ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.activity_grading_guides FROM anon;
REVOKE ALL ON public.quiz_question_keys FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.activity_grading_guides TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.quiz_question_keys TO authenticated;
DROP POLICY IF EXISTS "activity_guides_teacher_manage" ON public.activity_grading_guides;
CREATE POLICY "activity_guides_teacher_manage" ON public.activity_grading_guides FOR ALL TO authenticated
  USING (public.is_teacher()) WITH CHECK (public.is_teacher());
DROP POLICY IF EXISTS "question_keys_teacher_manage" ON public.quiz_question_keys;
CREATE POLICY "question_keys_teacher_manage" ON public.quiz_question_keys FOR ALL TO authenticated
  USING (public.is_teacher()) WITH CHECK (public.is_teacher());

-- Students may read their own quiz results, but only the server may write scores.
DROP POLICY IF EXISTS "quiz_submissions_student_manage_own" ON public.quiz_submissions;
DROP POLICY IF EXISTS "quiz_submissions_student_read_own" ON public.quiz_submissions;
CREATE POLICY "quiz_submissions_student_read_own" ON public.quiz_submissions FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.students s WHERE s.id=student_id AND s.auth_user_id=auth.uid()));
DROP POLICY IF EXISTS "quiz_submissions_teacher_read" ON public.quiz_submissions;
DROP POLICY IF EXISTS "quiz_submissions_teacher_manage" ON public.quiz_submissions;
CREATE POLICY "quiz_submissions_teacher_manage" ON public.quiz_submissions FOR ALL TO authenticated
  USING (public.is_teacher()) WITH CHECK (public.is_teacher());
REVOKE INSERT, UPDATE, DELETE ON public.quiz_submissions FROM authenticated;
GRANT INSERT, UPDATE, DELETE ON public.quiz_submissions TO service_role;

-- Teachers must not promote accounts by editing roles from the browser.
DROP POLICY IF EXISTS "profiles_teacher_update" ON public.profiles;
REVOKE UPDATE ON public.profiles FROM authenticated;

-- ===== 20261031001500_unique_quiz_attempts.sql =====
-- Enforce one result per student and quiz even when concurrent requests race.
-- Preserve any legacy duplicate rows in an audit table before keeping the earliest result.
CREATE TABLE IF NOT EXISTS public.quiz_submission_duplicate_archive (
  source_id UUID PRIMARY KEY,
  quiz_id INTEGER NOT NULL,
  student_id UUID NOT NULL,
  score NUMERIC(5,2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  archived_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  archive_reason TEXT NOT NULL DEFAULT 'Duplicate quiz submission preserved during one-attempt migration'
);

WITH ranked AS (
  SELECT id, ROW_NUMBER() OVER (
    PARTITION BY quiz_id, student_id
    ORDER BY created_at ASC, id ASC
  ) AS attempt_rank
  FROM public.quiz_submissions
)
INSERT INTO public.quiz_submission_duplicate_archive (source_id, quiz_id, student_id, score, created_at)
SELECT submission.id, submission.quiz_id, submission.student_id, submission.score, submission.created_at
FROM public.quiz_submissions AS submission
JOIN ranked ON ranked.id = submission.id
WHERE ranked.attempt_rank > 1
ON CONFLICT (source_id) DO NOTHING;

DELETE FROM public.quiz_submissions AS submission
USING public.quiz_submission_duplicate_archive AS archived
WHERE submission.id = archived.source_id;

CREATE UNIQUE INDEX IF NOT EXISTS idx_quiz_submissions_one_attempt_per_student
  ON public.quiz_submissions (quiz_id, student_id);

ALTER TABLE public.quiz_submission_duplicate_archive ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.quiz_submission_duplicate_archive FROM anon, authenticated;
GRANT SELECT ON public.quiz_submission_duplicate_archive TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.quiz_submission_duplicate_archive TO service_role;
DROP POLICY IF EXISTS "quiz_submission_archive_teacher_read" ON public.quiz_submission_duplicate_archive;
CREATE POLICY "quiz_submission_archive_teacher_read"
  ON public.quiz_submission_duplicate_archive FOR SELECT TO authenticated
  USING (public.is_teacher());

-- ===== 20261031001600_activity_evidence.sql =====
-- Persist student work from the curriculum activities without trusting client-side scores.
CREATE TABLE IF NOT EXISTS public.activity_evidence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  activity_id INTEGER NOT NULL REFERENCES public.activities(id) ON DELETE CASCADE,
  evidence JSONB NOT NULL CHECK (jsonb_typeof(evidence) = 'object'),
  score NUMERIC(5,2) CHECK (score IS NULL OR score >= 0),
  score_max NUMERIC(5,2) CHECK (score_max IS NULL OR score_max >= 0),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (student_id, activity_id),
  CHECK ((score IS NULL AND score_max IS NULL) OR (score IS NOT NULL AND score_max IS NOT NULL AND score <= score_max))
);

CREATE INDEX IF NOT EXISTS idx_activity_evidence_activity_updated
  ON public.activity_evidence (activity_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_evidence_student_updated
  ON public.activity_evidence (student_id, updated_at DESC);

ALTER TABLE public.activity_evidence ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.activity_evidence FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.activity_evidence TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.activity_evidence TO service_role;

DROP POLICY IF EXISTS "activity_evidence_student_read_own" ON public.activity_evidence;
CREATE POLICY "activity_evidence_student_read_own"
  ON public.activity_evidence FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.students s
    WHERE s.id = activity_evidence.student_id AND s.auth_user_id = auth.uid()
  ));
DROP POLICY IF EXISTS "activity_evidence_teacher_manage" ON public.activity_evidence;
CREATE POLICY "activity_evidence_teacher_manage"
  ON public.activity_evidence FOR ALL TO authenticated
  USING (public.is_teacher()) WITH CHECK (public.is_teacher());

-- ===== 20261031001700_published_resources_public_read.sql =====
-- Published curriculum resources are intentionally readable in the public,
-- no-account preview. Drafts and all write operations remain teacher-only.
GRANT SELECT ON public.learning_resources TO anon, authenticated;

DROP POLICY IF EXISTS "resources_read_published_or_teacher" ON public.learning_resources;
CREATE POLICY "resources_read_published_or_teacher"
  ON public.learning_resources FOR SELECT TO anon, authenticated
  USING (is_published OR (auth.uid() IS NOT NULL AND public.is_teacher()));

DROP POLICY IF EXISTS "learning_resource_objects_read" ON storage.objects;
CREATE POLICY "learning_resource_objects_read"
  ON storage.objects FOR SELECT TO anon, authenticated
  USING (
    bucket_id = 'learning-resources'
    AND (
      EXISTS (
        SELECT 1 FROM public.learning_resources r
        WHERE r.storage_path = storage.objects.name AND r.is_published
      )
      OR (auth.uid() IS NOT NULL AND public.is_teacher())
    )
  );

-- ===== 20261031001800_chat_realtime.sql =====
-- Enable low-latency chat updates. Clients keep a bounded polling fallback if
-- Realtime is not available in a self-hosted or not-yet-migrated environment.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime')
     AND NOT EXISTS (
       SELECT 1 FROM pg_publication_tables
       WHERE pubname = 'supabase_realtime'
         AND schemaname = 'public'
         AND tablename = 'messages'
     ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
  END IF;
END;
$$;

-- ===== 20261031001900_atomic_group_assignment.sql =====
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

  LOCK TABLE public.students IN SHARE MODE;
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

-- ===== 20261031002000_activity_evidence_review.sql =====
-- Keep teacher AI suggestions separate from a human-approved final mark.
ALTER TABLE public.activity_evidence
  ADD COLUMN IF NOT EXISTS ai_score NUMERIC(5,2)
    CHECK (ai_score IS NULL OR ai_score BETWEEN 0 AND 10),
  ADD COLUMN IF NOT EXISTS ai_feedback TEXT,
  ADD COLUMN IF NOT EXISTS ai_strengths TEXT,
  ADD COLUMN IF NOT EXISTS ai_weaknesses TEXT,
  ADD COLUMN IF NOT EXISTS ai_model_answer TEXT,
  ADD COLUMN IF NOT EXISTS teacher_score NUMERIC(5,2)
    CHECK (teacher_score IS NULL OR teacher_score BETWEEN 0 AND 10),
  ADD COLUMN IF NOT EXISTS teacher_feedback TEXT,
  ADD COLUMN IF NOT EXISTS graded_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS graded_at TIMESTAMPTZ;

-- ===== 20261031002100_atomic_group_regroup.sql =====
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

-- ===== 20261031002200_peer_instruction_votes.sql =====
-- Store individual peer instruction votes behind a server-only aggregate endpoint.
CREATE TABLE IF NOT EXISTS public.peer_instruction_votes (
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  question_id TEXT NOT NULL CHECK (question_id IN ('PI1', 'PI2', 'PI3')),
  first_choice SMALLINT CHECK (first_choice BETWEEN 0 AND 2),
  first_voted_at TIMESTAMPTZ,
  second_choice SMALLINT CHECK (second_choice BETWEEN 0 AND 2),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (student_id, question_id),
  CHECK (first_choice IS NOT NULL OR second_choice IS NULL),
  CHECK ((first_choice IS NULL AND first_voted_at IS NULL) OR (first_choice IS NOT NULL AND first_voted_at IS NOT NULL))
);

ALTER TABLE public.peer_instruction_votes ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.peer_instruction_votes FROM anon, authenticated;
GRANT ALL ON public.peer_instruction_votes TO service_role;

-- ===== 20261031002300_capacitance_lab_settings.sql =====
CREATE TABLE IF NOT EXISTS public.capacitance_lab_settings (
  id SMALLINT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  max_voltage NUMERIC(6,2) NOT NULL DEFAULT 12 CHECK (max_voltage BETWEEN 1 AND 60),
  plate_area_min_cm2 NUMERIC(8,2) NOT NULL DEFAULT 100 CHECK (plate_area_min_cm2 BETWEEN 1 AND 10000),
  plate_area_max_cm2 NUMERIC(8,2) NOT NULL DEFAULT 600 CHECK (plate_area_max_cm2 BETWEEN 1 AND 10000),
  plate_distance_min_mm NUMERIC(8,2) NOT NULL DEFAULT 1 CHECK (plate_distance_min_mm BETWEEN 0.1 AND 1000),
  plate_distance_max_mm NUMERIC(8,2) NOT NULL DEFAULT 10 CHECK (plate_distance_max_mm BETWEEN 0.1 AND 1000),
  dielectric_min NUMERIC(8,2) NOT NULL DEFAULT 1 CHECK (dielectric_min BETWEEN 1 AND 1000),
  dielectric_max NUMERIC(8,2) NOT NULL DEFAULT 10 CHECK (dielectric_max BETWEEN 1 AND 1000),
  dielectric_default NUMERIC(8,2) NOT NULL DEFAULT 2 CHECK (dielectric_default BETWEEN 1 AND 1000),
  updated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (plate_area_max_cm2 > plate_area_min_cm2),
  CHECK (plate_distance_max_mm > plate_distance_min_mm),
  CHECK (dielectric_max > dielectric_min),
  CHECK (dielectric_default BETWEEN dielectric_min AND dielectric_max)
);

INSERT INTO public.capacitance_lab_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;
ALTER TABLE public.capacitance_lab_settings ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.capacitance_lab_settings FROM anon;
GRANT SELECT, INSERT, UPDATE ON public.capacitance_lab_settings TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.capacitance_lab_settings TO service_role;

DROP POLICY IF EXISTS capacitance_lab_settings_read_authenticated ON public.capacitance_lab_settings;
CREATE POLICY capacitance_lab_settings_read_authenticated
  ON public.capacitance_lab_settings FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS capacitance_lab_settings_teacher_insert ON public.capacitance_lab_settings;
CREATE POLICY capacitance_lab_settings_teacher_insert
  ON public.capacitance_lab_settings FOR INSERT TO authenticated WITH CHECK (public.is_teacher());
DROP POLICY IF EXISTS capacitance_lab_settings_teacher_update ON public.capacitance_lab_settings;
CREATE POLICY capacitance_lab_settings_teacher_update
  ON public.capacitance_lab_settings FOR UPDATE TO authenticated
  USING (public.is_teacher()) WITH CHECK (public.is_teacher());

-- ===== 20261031002400_harden_api_rate_limit.sql =====
-- Move rate-limit accounting behind the server-only service role.
-- The previous authenticated RPC accepted arbitrary buckets and caller-chosen limits.
DROP FUNCTION IF EXISTS public.consume_api_rate_limit(TEXT, INTEGER, INTEGER);

CREATE OR REPLACE FUNCTION public.consume_api_rate_limit(
  p_user_id UUID,
  p_bucket TEXT,
  p_limit INTEGER,
  p_window_seconds INTEGER
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  expected_limit INTEGER;
  hits INTEGER;
  started TIMESTAMPTZ;
  v_now TIMESTAMPTZ := now();
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role'
    OR p_user_id IS NULL
    OR p_bucket IS NULL
    OR p_limit IS NULL
    OR p_window_seconds IS DISTINCT FROM 60 THEN
    RETURN FALSE;
  END IF;

  expected_limit := CASE p_bucket
    WHEN 'activity-evidence' THEN 120
    WHEN 'capacitance-lab-settings' THEN 120
    WHEN 'file-download' THEN 120
    WHEN 'peer-votes' THEN 30
    WHEN 'chat' THEN 12
    WHEN 'grade' THEN 8
    WHEN 'ocr' THEN 10
    WHEN 'quiz' THEN 10
    WHEN 'analytics' THEN 5
    WHEN 'readiness-analysis' THEN 5
    WHEN 'student-account' THEN 10
    WHEN 'class-catalog' THEN 120
    WHEN 'account-password' THEN 6
    ELSE NULL
  END;
  IF expected_limit IS NULL OR p_limit < 1 OR p_limit > expected_limit THEN
    RETURN FALSE;
  END IF;

  INSERT INTO public.api_rate_limits(user_id, bucket, window_started_at, hit_count)
  VALUES (p_user_id, p_bucket, v_now, 1)
  ON CONFLICT (user_id, bucket) DO UPDATE SET
    window_started_at = CASE
      WHEN EXCLUDED.window_started_at >= public.api_rate_limits.window_started_at + interval '60 seconds'
      THEN EXCLUDED.window_started_at ELSE public.api_rate_limits.window_started_at END,
    hit_count = CASE
      WHEN EXCLUDED.window_started_at >= public.api_rate_limits.window_started_at + interval '60 seconds'
      THEN 1 ELSE public.api_rate_limits.hit_count + 1 END
  RETURNING hit_count, window_started_at INTO hits, started;

  RETURN v_now < started + interval '60 seconds' AND hits <= p_limit;
END;
$$;

REVOKE ALL ON FUNCTION public.consume_api_rate_limit(UUID, TEXT, INTEGER, INTEGER) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.consume_api_rate_limit(UUID, TEXT, INTEGER, INTEGER) TO service_role;

-- ===== 20261031002500_scope_activity_file_reads.sql =====
-- Restrict lesson-file reads to teachers and activities open to students.
CREATE INDEX IF NOT EXISTS idx_activities_document_url ON public.activities(document_url) WHERE document_url IS NOT NULL;
DROP POLICY IF EXISTS "videos_read_authenticated" ON storage.objects;
DROP POLICY IF EXISTS "videos_read_activity_document" ON storage.objects;
CREATE POLICY "videos_read_activity_document" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'videos'
    AND (
      public.is_teacher()
      OR EXISTS (
        SELECT 1 FROM public.activities a
        WHERE a.document_url = storage.objects.name
          AND a.status = 'available'
      )
    )
  );

-- ===== 20261031002600_student_account_provisioning.sql =====
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

-- ===== 20261031002700_rubric_document_import.sql =====
-- Preserve the original teacher rubric document alongside extracted editable text.
-- The rubric is teacher-only data and remains protected by the existing guide RLS policy.
ALTER TABLE public.activity_grading_guides
  ADD COLUMN IF NOT EXISTS rubric_document_path TEXT,
  ADD COLUMN IF NOT EXISTS rubric_document_name TEXT;

ALTER TABLE public.activity_grading_guides
  DROP CONSTRAINT IF EXISTS activity_grading_guides_rubric_document_path_length;
ALTER TABLE public.activity_grading_guides
  ADD CONSTRAINT activity_grading_guides_rubric_document_path_length
  CHECK (rubric_document_path IS NULL OR char_length(rubric_document_path) <= 700);

ALTER TABLE public.activity_grading_guides
  DROP CONSTRAINT IF EXISTS activity_grading_guides_rubric_document_name_length;
ALTER TABLE public.activity_grading_guides
  ADD CONSTRAINT activity_grading_guides_rubric_document_name_length
  CHECK (rubric_document_name IS NULL OR char_length(rubric_document_name) BETWEEN 1 AND 255);

-- ===== 20261031002800_teacher_final_feedback.sql =====
-- Store the teacher's final feedback separately from AI suggestions.
ALTER TABLE public.submissions
  ADD COLUMN IF NOT EXISTS teacher_feedback TEXT;

ALTER TABLE public.group_submissions
  ADD COLUMN IF NOT EXISTS teacher_feedback TEXT;

-- Keep rich feedback useful without letting accidental pasted dumps bloat a row.
ALTER TABLE public.submissions
  DROP CONSTRAINT IF EXISTS submissions_teacher_feedback_length;
ALTER TABLE public.submissions
  ADD CONSTRAINT submissions_teacher_feedback_length
  CHECK (teacher_feedback IS NULL OR char_length(teacher_feedback) <= 5000);

ALTER TABLE public.group_submissions
  DROP CONSTRAINT IF EXISTS group_submissions_teacher_feedback_length;
ALTER TABLE public.group_submissions
  ADD CONSTRAINT group_submissions_teacher_feedback_length
  CHECK (teacher_feedback IS NULL OR char_length(teacher_feedback) <= 5000);

-- ===== 20261031002900_submission_api_rate_limit.sql =====
-- Add the server-only submission bucket without reopening the rate-limit RPC to clients.
CREATE OR REPLACE FUNCTION public.consume_api_rate_limit(
  p_user_id UUID,
  p_bucket TEXT,
  p_limit INTEGER,
  p_window_seconds INTEGER
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  expected_limit INTEGER;
  hits INTEGER;
  started TIMESTAMPTZ;
  v_now TIMESTAMPTZ := now();
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role'
    OR p_user_id IS NULL
    OR p_bucket IS NULL
    OR p_limit IS NULL
    OR p_window_seconds IS DISTINCT FROM 60 THEN
    RETURN FALSE;
  END IF;

  expected_limit := CASE p_bucket
    WHEN 'activity-evidence' THEN 120
    WHEN 'capacitance-lab-settings' THEN 120
    WHEN 'file-download' THEN 120
    WHEN 'peer-votes' THEN 30
    WHEN 'chat' THEN 12
    WHEN 'grade' THEN 8
    WHEN 'ocr' THEN 10
    WHEN 'quiz' THEN 10
    WHEN 'analytics' THEN 5
    WHEN 'readiness-analysis' THEN 5
    WHEN 'student-account' THEN 10
    WHEN 'class-catalog' THEN 120
    WHEN 'account-password' THEN 6
    WHEN 'submission' THEN 12
    WHEN 'group-submission' THEN 12
    ELSE NULL
  END;
  IF expected_limit IS NULL OR p_limit < 1 OR p_limit > expected_limit THEN
    RETURN FALSE;
  END IF;

  INSERT INTO public.api_rate_limits(user_id, bucket, window_started_at, hit_count)
  VALUES (p_user_id, p_bucket, v_now, 1)
  ON CONFLICT (user_id, bucket) DO UPDATE SET
    window_started_at = CASE
      WHEN EXCLUDED.window_started_at >= public.api_rate_limits.window_started_at + interval '60 seconds'
      THEN EXCLUDED.window_started_at ELSE public.api_rate_limits.window_started_at END,
    hit_count = CASE
      WHEN EXCLUDED.window_started_at >= public.api_rate_limits.window_started_at + interval '60 seconds'
      THEN 1 ELSE public.api_rate_limits.hit_count + 1 END
  RETURNING hit_count, window_started_at INTO hits, started;

  RETURN v_now < started + interval '60 seconds' AND hits <= p_limit;
END;
$$;

REVOKE ALL ON FUNCTION public.consume_api_rate_limit(UUID, TEXT, INTEGER, INTEGER) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.consume_api_rate_limit(UUID, TEXT, INTEGER, INTEGER) TO service_role;

-- ===== 20261101000100_group_rubric_documents.sql =====
-- Keep the editable rubric text and its original file together on each group assignment.
ALTER TABLE public.group_assignments
  ADD COLUMN IF NOT EXISTS rubric_document_path TEXT,
  ADD COLUMN IF NOT EXISTS rubric_document_name TEXT;

ALTER TABLE public.group_assignments
  DROP CONSTRAINT IF EXISTS group_assignments_rubric_document_path_length;
ALTER TABLE public.group_assignments
  ADD CONSTRAINT group_assignments_rubric_document_path_length
  CHECK (rubric_document_path IS NULL OR char_length(rubric_document_path) <= 700);

ALTER TABLE public.group_assignments
  DROP CONSTRAINT IF EXISTS group_assignments_rubric_document_name_length;
ALTER TABLE public.group_assignments
  ADD CONSTRAINT group_assignments_rubric_document_name_length
  CHECK (rubric_document_name IS NULL OR char_length(rubric_document_name) BETWEEN 1 AND 255);

DROP POLICY IF EXISTS "group_rubric_objects_read_members" ON storage.objects;
CREATE POLICY "group_rubric_objects_read_members" ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'class-work'
    AND (storage.foldername(name))[1] = 'group-rubrics'
    AND EXISTS (
      SELECT 1
      FROM public.group_assignments a
      JOIN public.group_assignment_groups g ON g.assignment_id = a.id
      JOIN public.group_assignment_members m ON m.group_id = g.id
      JOIN public.students s ON s.id = m.student_id
      WHERE a.rubric_document_path = storage.objects.name
        AND s.auth_user_id = auth.uid()
    )
  );

-- ===== 20261101000200_group_assignment_classes.sql =====
-- Scope each group assignment to one class while preserving legacy all-class assignments.
ALTER TABLE public.group_assignments
  ADD COLUMN IF NOT EXISTS class_name TEXT;

ALTER TABLE public.group_assignments
  DROP CONSTRAINT IF EXISTS group_assignments_class_name_length;
ALTER TABLE public.group_assignments
  ADD CONSTRAINT group_assignments_class_name_length
  CHECK (class_name IS NULL OR char_length(class_name) BETWEEN 1 AND 40);

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
  WHERE v_class_name IS NULL OR lower(btrim(student.class_name)) = lower(btrim(v_class_name));
  IF v_student_count = 0 THEN
    RAISE EXCEPTION 'No students found in the selected class' USING ERRCODE = '22023';
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
    SELECT student.id,
      ROW_NUMBER() OVER (
        ORDER BY CASE WHEN COALESCE(p_random, FALSE) THEN random() ELSE 0 END,
                 LOWER(student.full_name), student.id
      ) AS position
    FROM public.students AS student
    WHERE v_class_name IS NULL OR lower(btrim(student.class_name)) = lower(btrim(v_class_name))
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
  WHERE v_class_name IS NULL OR lower(btrim(student.class_name)) = lower(v_class_name);
  IF v_student_count = 0 THEN
    RAISE EXCEPTION 'Import students into this class before creating groups' USING ERRCODE = '22023';
  END IF;
  IF v_student_count > p_group_count * p_max_students THEN
    RAISE EXCEPTION 'Group capacity is smaller than the class size' USING ERRCODE = '22023';
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
      WHERE v_class_name IS NULL OR lower(btrim(student.class_name)) = lower(v_class_name)
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

REVOKE ALL ON FUNCTION public.create_group_assignment_for_class(TEXT, TEXT, TIMESTAMPTZ, TEXT, TEXT, TEXT, INTEGER, INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_group_assignment_for_class(TEXT, TEXT, TIMESTAMPTZ, TEXT, TEXT, TEXT, INTEGER, INTEGER) TO authenticated;

-- ===== 20261101000300_public_curriculum_anon_read.sql =====
-- Public visitors need only published curriculum metadata; answer keys remain private.
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "activities_read_public" ON public.activities;
DROP POLICY IF EXISTS "activities_read_published_metadata" ON public.activities;
CREATE POLICY "activities_read_published_metadata"
  ON public.activities
  FOR SELECT
  TO anon
  USING (status IN ('available', 'locked', 'done'));

REVOKE SELECT ON public.activities FROM anon;
GRANT SELECT (
  id, title, description, phase, type, duration, status, deliverable,
  course_id, chapter_id, accepting_submissions, deadline
) ON public.activities TO anon;

-- ===== 20261101000400_chat_attachment_mime_types.sql =====
-- Add common mobile image, Mac/iWork, LibreOffice, archive, audio and video types
-- while preserving the existing private bucket settings and size limit.
UPDATE storage.buckets AS bucket
SET allowed_mime_types = ARRAY(
  SELECT DISTINCT mime_type
  FROM unnest(bucket.allowed_mime_types || ARRAY[
    'application/rtf', 'text/rtf',
    'application/vnd.oasis.opendocument.text',
    'application/vnd.oasis.opendocument.spreadsheet',
    'application/vnd.oasis.opendocument.presentation',
    'application/vnd.oasis.opendocument.graphics',
    'application/vnd.apple.pages', 'application/vnd.apple.numbers', 'application/vnd.apple.keynote',
    'application/vnd.rar', 'application/x-rar-compressed', 'application/x-7z-compressed',
    'image/heic', 'image/heif', 'image/tiff',
    'audio/aac', 'audio/ogg', 'video/quicktime',
    'text/markdown', 'application/json', 'application/xml', 'text/xml'
  ]::TEXT[]) AS allowed(mime_type)
  ORDER BY mime_type
)
WHERE bucket.id = 'class-work'
  AND bucket.allowed_mime_types IS NOT NULL;

-- ===== 20261101000500_chat_image_mime_types.sql =====
-- Add browser-friendly AVIF and BMP images to the private chat upload allowlist.
-- Preserve unlimited buckets configured with a NULL MIME allowlist.
UPDATE storage.buckets AS bucket
SET allowed_mime_types = ARRAY(
  SELECT DISTINCT mime_type
  FROM unnest(bucket.allowed_mime_types || ARRAY['image/avif', 'image/bmp']::TEXT[]) AS allowed(mime_type)
  ORDER BY mime_type
)
WHERE bucket.id = 'class-work'
  AND bucket.allowed_mime_types IS NOT NULL;

-- ===== 20261103000100_student_username_auth.sql =====
-- Username đăng nhập học sinh; mật khẩu tạm chỉ trả về một lần, không lưu trong database.
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS username TEXT;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS birth_date DATE;

-- Tài khoản cũ vẫn đăng nhập được; gán username kỹ thuật ổn định cho hồ sơ đã tồn tại.
UPDATE public.students
SET username = 'hs' || LEFT(REPLACE(id::text, '-', ''), 12)
WHERE username IS NULL OR BTRIM(username) = '';

CREATE UNIQUE INDEX IF NOT EXISTS idx_students_username_unique
  ON public.students (LOWER(username)) WHERE username IS NOT NULL;
ALTER TABLE public.students ALTER COLUMN username SET NOT NULL;

-- Chỉ lưu hash định danh ngắn hạn; không lưu IP hoặc mật khẩu thô.
CREATE TABLE IF NOT EXISTS public.student_auth_rate_limits (
  subject_hash TEXT PRIMARY KEY CHECK (subject_hash ~ '^[a-f0-9]{64}$'),
  window_started_at TIMESTAMPTZ NOT NULL,
  hit_count INTEGER NOT NULL CHECK (hit_count > 0)
);
ALTER TABLE public.student_auth_rate_limits ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.student_auth_rate_limits FROM PUBLIC, anon, authenticated;

CREATE INDEX IF NOT EXISTS idx_student_auth_rate_limits_window ON public.student_auth_rate_limits(window_started_at);

CREATE OR REPLACE FUNCTION public.consume_student_auth_rate_limit(
  p_subject_hash TEXT,
  p_limit INTEGER DEFAULT 8,
  p_window_seconds INTEGER DEFAULT 600
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  hits INTEGER;
  started TIMESTAMPTZ;
  v_now TIMESTAMPTZ := now();
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role'
    OR p_subject_hash IS NULL
    OR p_subject_hash !~ '^[a-f0-9]{64}$'
    OR p_limit IS NULL OR p_limit NOT IN (8, 30)
    OR p_window_seconds IS DISTINCT FROM 600 THEN
    RETURN FALSE;
  END IF;

  DELETE FROM public.student_auth_rate_limits
  WHERE window_started_at < v_now - interval '24 hours';

  INSERT INTO public.student_auth_rate_limits(subject_hash, window_started_at, hit_count)
  VALUES (p_subject_hash, v_now, 1)
  ON CONFLICT (subject_hash) DO UPDATE SET
    window_started_at = CASE
      WHEN EXCLUDED.window_started_at >= public.student_auth_rate_limits.window_started_at + interval '600 seconds'
      THEN EXCLUDED.window_started_at ELSE public.student_auth_rate_limits.window_started_at END,
    hit_count = CASE
      WHEN EXCLUDED.window_started_at >= public.student_auth_rate_limits.window_started_at + interval '600 seconds'
      THEN 1 ELSE public.student_auth_rate_limits.hit_count + 1 END
  RETURNING hit_count, window_started_at INTO hits, started;

  RETURN v_now < started + interval '600 seconds' AND hits <= p_limit;
END;
$$;

REVOKE ALL ON FUNCTION public.consume_student_auth_rate_limit(TEXT, INTEGER, INTEGER) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.consume_student_auth_rate_limit(TEXT, INTEGER, INTEGER) TO service_role;

-- ===== 20261103000200_student_archive.sql =====
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

-- ===== 20261103000300_protect_group_teacher_feedback.sql =====
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

-- ===== 20261103000400_validate_group_submission_payload.sql =====
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

-- ===== 20261104000100_student_questions.sql =====
-- "Góc hỏi đáp" question tracker (đặc tả 4.7).
-- Students raise a question with a topic and the teacher answers and updates the
-- handling status. Teachers can read every question; students can only read and
-- create their own.
CREATE TABLE IF NOT EXISTS public.student_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  topic TEXT NOT NULL,
  content TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'unanswered' CHECK (status IN ('unanswered', 'answered', 'resolved')),
  teacher_response TEXT,
  responder_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  responded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (char_length(btrim(content)) BETWEEN 5 AND 1500),
  CHECK (teacher_response IS NULL OR char_length(teacher_response) <= 3000),
  CHECK (status = 'unanswered' OR teacher_response IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS idx_student_questions_student_created
  ON public.student_questions (student_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_student_questions_status_created
  ON public.student_questions (status, created_at DESC);

ALTER TABLE public.student_questions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.student_questions FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.student_questions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.student_questions TO service_role;

DROP POLICY IF EXISTS "student_questions_student_read_own" ON public.student_questions;
CREATE POLICY "student_questions_student_read_own"
  ON public.student_questions FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.students s
    WHERE s.id = student_questions.student_id AND s.auth_user_id = auth.uid()
  ));

DROP POLICY IF EXISTS "student_questions_student_insert_own" ON public.student_questions;
CREATE POLICY "student_questions_student_insert_own"
  ON public.student_questions FOR INSERT TO authenticated
  WITH CHECK (
    status = 'unanswered'
    AND teacher_response IS NULL
    AND EXISTS (
      SELECT 1 FROM public.students s
      WHERE s.id = student_questions.student_id AND s.auth_user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "student_questions_teacher_manage" ON public.student_questions;
CREATE POLICY "student_questions_teacher_manage"
  ON public.student_questions FOR ALL TO authenticated
  USING (public.is_teacher()) WITH CHECK (public.is_teacher());

-- Keep the server-only rate-limit RPC in sync with the new bucket. This mirrors
-- the existing pattern of re-declaring consume_api_rate_limit so the whitelist
-- of allowed buckets stays single-sourced in the database.
CREATE OR REPLACE FUNCTION public.consume_api_rate_limit(
  p_user_id UUID,
  p_bucket TEXT,
  p_limit INTEGER,
  p_window_seconds INTEGER
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  expected_limit INTEGER;
  hits INTEGER;
  started TIMESTAMPTZ;
  v_now TIMESTAMPTZ := now();
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role'
    OR p_user_id IS NULL
    OR p_bucket IS NULL
    OR p_limit IS NULL
    OR p_window_seconds IS DISTINCT FROM 60 THEN
    RETURN FALSE;
  END IF;

  expected_limit := CASE p_bucket
    WHEN 'activity-evidence' THEN 120
    WHEN 'capacitance-lab-settings' THEN 120
    WHEN 'file-download' THEN 120
    WHEN 'peer-votes' THEN 30
    WHEN 'chat' THEN 12
    WHEN 'grade' THEN 8
    WHEN 'ocr' THEN 10
    WHEN 'quiz' THEN 10
    WHEN 'analytics' THEN 5
    WHEN 'readiness-analysis' THEN 5
    WHEN 'student-account' THEN 10
    WHEN 'class-catalog' THEN 120
    WHEN 'account-password' THEN 6
    WHEN 'submission' THEN 12
    WHEN 'group-submission' THEN 12
    WHEN 'student-question' THEN 20
    WHEN 'class-catalog' THEN 120
    ELSE NULL
  END;
  IF expected_limit IS NULL OR p_limit < 1 OR p_limit > expected_limit THEN
    RETURN FALSE;
  END IF;

  INSERT INTO public.api_rate_limits(user_id, bucket, window_started_at, hit_count)
  VALUES (p_user_id, p_bucket, v_now, 1)
  ON CONFLICT (user_id, bucket) DO UPDATE SET
    window_started_at = CASE
      WHEN EXCLUDED.window_started_at >= public.api_rate_limits.window_started_at + interval '60 seconds'
      THEN EXCLUDED.window_started_at ELSE public.api_rate_limits.window_started_at END,
    hit_count = CASE
      WHEN EXCLUDED.window_started_at >= public.api_rate_limits.window_started_at + interval '60 seconds'
      THEN 1 ELSE public.api_rate_limits.hit_count + 1 END
  RETURNING hit_count, window_started_at INTO hits, started;

  RETURN v_now < started + interval '60 seconds' AND hits <= p_limit;
END;
$$;

REVOKE ALL ON FUNCTION public.consume_api_rate_limit(UUID, TEXT, INTEGER, INTEGER) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.consume_api_rate_limit(UUID, TEXT, INTEGER, INTEGER) TO service_role;

-- ===== 20261104000200_learning_result_metrics.sql =====
-- 4.8 Kết quả học tập của học sinh: bổ sung các chỉ số theo dõi.
-- Các chỉ số chỉ được tính từ dữ liệu thật do website ghi nhận (đặc tả 4.8),
-- không điền sẵn giá trị giả định.
ALTER TABLE public.activity_evidence
  ADD COLUMN IF NOT EXISTS first_attempt_correct BOOLEAN,
  ADD COLUMN IF NOT EXISTS correct_after_hint BOOLEAN,
  ADD COLUMN IF NOT EXISTS attempts_count INTEGER NOT NULL DEFAULT 1 CHECK (attempts_count >= 1),
  ADD COLUMN IF NOT EXISTS hint_count INTEGER NOT NULL DEFAULT 0 CHECK (hint_count >= 0),
  ADD COLUMN IF NOT EXISTS review_topics TEXT[] NOT NULL DEFAULT '{}';

CREATE INDEX IF NOT EXISTS idx_activity_evidence_first_attempt
  ON public.activity_evidence (student_id, first_attempt_correct) WHERE first_attempt_correct IS NOT NULL;

-- ===== 20261104000300_statement_game.sql =====
-- 4.5 Trò chơi "Truy tìm phát biểu sai": phát biểu, lượt chơi và điểm nhóm.
-- Mỗi phát biểu có một đáp án đúng/sai đã duyệt; học sinh chọn phát biểu sai,
-- giải thích lí do rồi nhấn "Kiểm tra". Hệ thống ghi nhận số câu đúng,
-- số lần thử và điểm của từng nhóm.
CREATE TABLE IF NOT EXISTS public.game_statements (
  id SERIAL PRIMARY KEY,
  statement TEXT NOT NULL,
  is_false BOOLEAN NOT NULL,
  explanation TEXT NOT NULL,
  topic TEXT NOT NULL DEFAULT 'capacitance',
  display_order INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS public.game_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID REFERENCES public.group_assignment_groups(id) ON DELETE CASCADE,
  student_id UUID REFERENCES public.students(id) ON DELETE CASCADE,
  correct_count INTEGER NOT NULL DEFAULT 0 CHECK (correct_count >= 0),
  attempt_count INTEGER NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
  score NUMERIC(5,2) NOT NULL DEFAULT 0 CHECK (score >= 0),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_game_scores_group ON public.game_scores (group_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_game_scores_student ON public.game_scores (student_id, updated_at DESC);

ALTER TABLE public.game_statements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_scores ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.game_statements FROM anon, authenticated;
REVOKE ALL ON public.game_scores FROM anon, authenticated;
GRANT SELECT ON public.game_statements TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.game_scores TO authenticated;
GRANT ALL ON public.game_statements, public.game_scores TO service_role;

DROP POLICY IF EXISTS "game_statements_read_authenticated" ON public.game_statements;
CREATE POLICY "game_statements_read_authenticated"
  ON public.game_statements FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "game_scores_student_read_own" ON public.game_scores;
CREATE POLICY "game_scores_student_read_own"
  ON public.game_scores FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.students s
    WHERE s.id = game_scores.student_id AND s.auth_user_id = auth.uid()
  ));

DROP POLICY IF EXISTS "game_scores_student_insert_own" ON public.game_scores;
CREATE POLICY "game_scores_student_insert_own"
  ON public.game_scores FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.students s
    WHERE s.id = game_scores.student_id AND s.auth_user_id = auth.uid()
  ));

DROP POLICY IF EXISTS "game_scores_teacher_manage" ON public.game_scores;
CREATE POLICY "game_scores_teacher_manage"
  ON public.game_scores FOR ALL TO authenticated
  USING (public.is_teacher()) WITH CHECK (public.is_teacher());

-- Seed phát biểu mẫu theo đặc tả 4.5 (đúng/sai đã duyệt).
INSERT INTO public.game_statements (statement, is_false, explanation, topic, display_order) VALUES
  ('Hai bản tụ điện sau khi được tích điện mang điện tích cùng dấu', true, 'Hai bản tụ mang điện tích trái dấu và có độ lớn bằng nhau.', 'charge', 1),
  ('Tụ điện gồm hai vật dẫn ngăn cách bởi môi trường cách điện', false, 'Đây là cấu tạo đúng của tụ điện phẳng.', 'structure', 2),
  ('Sau khi ngắt nguồn, tụ điện lí tưởng giữ nguyên điện tích', false, 'Mô hình lí tưởng bỏ qua rò điện nên điện tích giữ nguyên.', 'charge', 3),
  ('Điện dung của tụ phụ thuộc vào hiệu điện thế đặt vào hai đầu tụ', true, 'Điện dung do cấu tạo (S, d, εr) quyết định, không phụ thuộc U.', 'capacitance', 4),
  ('Tăng diện tích bản tụ thì điện dung tăng', false, 'C tỉ lệ thuận với diện tích bản tụ.', 'capacitance', 5),
  ('Tăng khoảng cách giữa hai bản tụ thì điện dung tăng', true, 'C tỉ lệ nghịch với khoảng cách d; tăng d thì C giảm.', 'capacitance', 6),
  ('Năng lượng tụ điện tỉ lệ với bình phương hiệu điện thế', false, 'W = 1/2 C U² nên năng lượng tỉ lệ với U².', 'energy', 7),
  ('Tụ trong flash máy ảnh tích trữ và giải phóng năng lượng nhanh', false, 'Đây là ứng dụng đúng của tụ điện.', 'energy', 8)
ON CONFLICT DO NOTHING;

-- ===== 20261104000400_student_code.sql =====
-- Mục 4: lưu mã số sinh viên (MSSV) khi nhập danh sách từ tệp.
-- Nếu tệp không có cột mã thì để trống, giáo viên tự điền sau.
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS student_code TEXT;

CREATE INDEX IF NOT EXISTS idx_students_student_code
  ON public.students (LOWER(student_code)) WHERE student_code IS NOT NULL;

-- Số lượng lớp: đảm bảo truy vấn lọc theo lớp nhanh khi có nhiều lớp.
CREATE INDEX IF NOT EXISTS idx_students_class_name
  ON public.students (LOWER(class_name));

-- ===== 20261104000500_password_changed.sql =====
-- Mục 5: theo dõi trạng thái đổi mật khẩu để bảo mật.
-- Sau khi học sinh đổi mật khẩu lần đầu, giáo viên không còn thấy mật khẩu
-- mà chỉ thấy trạng thái "Đã đổi mật khẩu".
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS password_changed BOOLEAN NOT NULL DEFAULT FALSE;

-- ===== 20261104000600_chat_deletion_block.sql =====
-- Mục 8: chế độ cấm xóa tin nhắn trong kênh thảo luận.
-- Khi giáo viên bật deletion_blocked, học sinh không còn xóa được tin nhắn.
ALTER TABLE public.chat_settings ADD COLUMN IF NOT EXISTS deletion_blocked BOOLEAN NOT NULL DEFAULT FALSE;

DROP POLICY IF EXISTS "messages_delete_own_or_teacher" ON public.messages;
CREATE POLICY "messages_delete_own_or_teacher" ON public.messages FOR DELETE TO authenticated
  USING (
    public.is_teacher()
    OR (
      sender_id = auth.uid()
      AND EXISTS (SELECT 1 FROM public.chat_settings cs WHERE cs.id = 1 AND cs.deletion_blocked = FALSE)
    )
  );

-- ===== 20261104000700_question_attachments.sql =====
-- Mục 1: hỏi đáp cho phép học sinh đính kèm ảnh/video/link bên cạnh câu hỏi chữ.
-- attachment_path lưu đường dẫn tệp trong Supabase Storage (private).
-- attachment_url lưu liên kết ngoài http(s) do học sinh dán vào.
ALTER TABLE public.student_questions
  ADD COLUMN IF NOT EXISTS attachment_path TEXT,
  ADD COLUMN IF NOT EXISTS attachment_url TEXT,
  ADD COLUMN IF NOT EXISTS attachment_name TEXT;

CREATE INDEX IF NOT EXISTS idx_student_questions_attachment
  ON public.student_questions (attachment_path) WHERE attachment_path IS NOT NULL;

-- ===== 20261104000800_quiz_time_tracking.sql =====
-- Mục 7: lưu thời gian làm bài trắc nghiệm để giáo viên thống kê.
-- started_at do hệ thống ghi khi học sinh mở bài; time_spent_seconds do client
-- đo và gửi lên (máy chủ vẫn giới hạn trong khoảng hợp lệ).
ALTER TABLE public.quiz_submissions
  ADD COLUMN IF NOT EXISTS started_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS time_spent_seconds INTEGER CHECK (time_spent_seconds IS NULL OR time_spent_seconds >= 0);

CREATE INDEX IF NOT EXISTS idx_quiz_submissions_started ON public.quiz_submissions (quiz_id, started_at DESC);

-- ===== 20261104000900_storage_bucket_limits.sql =====
-- Mục 4 & 9: đảm bảo bucket kho học liệu tồn tại với giới hạn 100 MB và nhận
-- mọi định dạng tệp (docx, pdf, video, ảnh...). Idempotent — chạy lại an toàn.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('learning-resources', 'learning-resources', FALSE, 104857600, NULL)
ON CONFLICT (id) DO UPDATE SET
  public = FALSE,
  file_size_limit = 104857600,
  allowed_mime_types = NULL;

-- Đảm bảo bucket bài làm/nộp bài cũng nhận tệp 100 MB.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('class-work', 'class-work', FALSE, 104857600, NULL)
ON CONFLICT (id) DO UPDATE SET
  public = FALSE,
  file_size_limit = 104857600;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('videos', 'videos', FALSE, 104857600, NULL)
ON CONFLICT (id) DO UPDATE SET
  public = FALSE,
  file_size_limit = 104857600;

-- ===== 20261104001000_student_presence.sql =====
-- Mục 7: theo dõi trạng thái online/offline của học sinh.
-- last_seen_at được cập nhật mỗi khi học sinh hoạt động trên web;
-- coi là "đang online" nếu hoạt động trong vòng 5 phút gần nhất.
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_students_last_seen ON public.students (last_seen_at DESC);

-- ===== 20261104001100_soft_delete_quizzes_groups.sql =====
-- Nút "Xóa + Hoàn tác" cho bài trắc nghiệm và bài tập nhóm dùng xóa MỀM:
-- xóa chỉ đánh dấu archived_at; hoàn tác bỏ đánh dấu, dữ liệu và kết quả làm bài
-- vẫn còn nguyên. Danh sách hiển thị lọc archived_at IS NULL.
ALTER TABLE public.quizzes ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;
ALTER TABLE public.group_assignments ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_quizzes_archived ON public.quizzes (archived_at);
CREATE INDEX IF NOT EXISTS idx_group_assignments_archived ON public.group_assignments (archived_at);

-- ===== 20261104001200_quiz_review_snapshot.sql =====
-- Mục 13: lưu lại bài làm trắc nghiệm để học sinh xem lại sau khi nộp (như Azota).
-- review chứa đáp án đúng + giải thích TỪNG CÂU, chỉ ghi SAU KHI nộp thành công,
-- và RLS "student_read_own" chỉ cho học sinh đọc dòng của CHÍNH MÌNH sau khi đã nộp,
-- nên không lộ đáp án trước lúc làm bài.
ALTER TABLE public.quiz_submissions
  ADD COLUMN IF NOT EXISTS answers JSONB,
  ADD COLUMN IF NOT EXISTS review JSONB;

CREATE INDEX IF NOT EXISTS idx_quiz_submissions_student ON public.quiz_submissions (student_id, created_at DESC);


-- Chot: bao dam trigger tu tao ho so hoc sinh (an toan chay lai nhieu lan)
CREATE OR REPLACE FUNCTION public.create_student_profile()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  INSERT INTO public.profiles (id, role, full_name)
  VALUES (NEW.id, 'student', COALESCE(NEW.raw_user_meta_data ->> 'full_name', ''))
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS on_auth_user_created_profile ON auth.users;
CREATE TRIGGER on_auth_user_created_profile
  AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.create_student_profile();

-- ===== 20261104001300_classes_management.sql =====
-- Quản lý lớp học: danh mục lớp -> học sinh thuộc lớp.
-- Một học sinh thuộc đúng một lớp (students.class_name tham chiếu classes.name).

CREATE TABLE IF NOT EXISTS public.classes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  grade_level TEXT,
  school_year TEXT,
  homeroom_teacher TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_classes_name ON public.classes (name);

ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.classes FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.classes TO authenticated;
GRANT ALL ON public.classes TO service_role;

DROP POLICY IF EXISTS "classes_read_authenticated" ON public.classes;
CREATE POLICY "classes_read_authenticated"
  ON public.classes FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "classes_teacher_manage" ON public.classes;
CREATE POLICY "classes_teacher_manage"
  ON public.classes FOR ALL TO authenticated
  USING (public.is_teacher()) WITH CHECK (public.is_teacher());

-- Cập nhật updated_at khi sửa lớp.
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_classes_touch ON public.classes;
CREATE TRIGGER trg_classes_touch BEFORE UPDATE ON public.classes
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Đồng bộ: mọi class_name của học sinh đều phải có trong danh mục lớp (nếu bảng đã có dữ liệu).
-- Không chặn dữ liệu cũ; chỉ đảm bảo danh mục lớp dùng chung.


-- ===== 20261105000100_teacher_model_answer.sql =====
-- "Ghi chú đáp án đúng của cô" cho bài tự luận:
-- Giáo viên nhập đáp án mẫu khi chấm; học sinh thấy sau khi bài được chấm (status = graded).
ALTER TABLE public.submissions
  ADD COLUMN IF NOT EXISTS teacher_model_answer TEXT;

ALTER TABLE public.submissions
  DROP CONSTRAINT IF EXISTS submissions_teacher_model_answer_length;
ALTER TABLE public.submissions
  ADD CONSTRAINT submissions_teacher_model_answer_length
  CHECK (teacher_model_answer IS NULL OR char_length(teacher_model_answer) <= 5000);

-- Bài nhóm cũng hỗ trợ đáp án mẫu của cô.
ALTER TABLE public.group_submissions
  ADD COLUMN IF NOT EXISTS teacher_model_answer TEXT;

ALTER TABLE public.group_submissions
  DROP CONSTRAINT IF EXISTS group_submissions_teacher_model_answer_length;
ALTER TABLE public.group_submissions
  ADD CONSTRAINT group_submissions_teacher_model_answer_length
  CHECK (teacher_model_answer IS NULL OR char_length(teacher_model_answer) <= 5000);

-- Học sinh chỉ đọc đáp án mẫu khi bài đã được chấm xong (đúng quy tắc: không lộ đáp án khi chưa chấm).
-- Policy đọc submissions của học sinh đã có; cột mới tự đi theo SELECT *. Ràng buộc hiển thị do app
-- (chưa graded thì không render). Trigger bảo vệ: học sinh không tự ghi đè cột này.
CREATE OR REPLACE FUNCTION public.protect_submission_teacher_columns()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF auth.role() = 'authenticated' AND NOT public.is_teacher() THEN
    NEW.teacher_model_answer := OLD.teacher_model_answer;
    NEW.teacher_feedback := OLD.teacher_feedback;
    NEW.final_score := OLD.final_score;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_submission_teacher_columns ON public.submissions;
CREATE TRIGGER trg_protect_submission_teacher_columns BEFORE UPDATE ON public.submissions
  FOR EACH ROW EXECUTE FUNCTION public.protect_submission_teacher_columns();

DROP TRIGGER IF EXISTS trg_protect_group_submission_teacher_columns ON public.group_submissions;
CREATE TRIGGER trg_protect_group_submission_teacher_columns BEFORE UPDATE ON public.group_submissions
  FOR EACH ROW EXECUTE FUNCTION public.protect_submission_teacher_columns();

-- ===== 20261106000100_message_sender_role.sql =====
-- Phân biệt vai trò người gửi trong kênh thảo luận.
-- Trước đây app đoán giáo viên qua tên hiển thị ("Cô ..."/"(Giáo viên)") nên hiển thị sai khi tên khác quy ước.
-- Cột sender_role do DB/trigger gán theo profiles.role của auth.uid(), KHÔNG tin dữ liệu client gửi lên.
ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS sender_role TEXT;

ALTER TABLE public.messages
  DROP CONSTRAINT IF EXISTS messages_sender_role_check;
ALTER TABLE public.messages
  ADD CONSTRAINT messages_sender_role_check
  CHECK (sender_role IS NULL OR sender_role IN ('teacher', 'student'));

-- Backfill dữ liệu cũ từ profiles (chỉ khi có sender_id).
UPDATE public.messages AS m
SET sender_role = p.role
FROM public.profiles AS p
WHERE m.sender_id = p.id AND m.sender_role IS NULL AND p.role IN ('teacher', 'student');

-- Trigger: mọi tin nhắn mới luôn được gán theo hồ sơ của người đăng nhập (auth.uid()),
-- nên client không cần (và không thể) tự đặt tên/vai trò/người gửi một cách thiếu nhất quán.
CREATE OR REPLACE FUNCTION public.set_message_sender_role()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_profile RECORD;
BEGIN
  -- Lấy hồ sơ của người đang đăng nhập (ưu tiên auth.uid(); giữ sender_id cũ nếu có).
  SELECT p.id, p.role, p.full_name
    INTO v_profile
  FROM public.profiles AS p
  WHERE p.id = NEW.sender_id
     OR p.id = auth.uid()
  ORDER BY (p.id = NEW.sender_id) DESC, (p.id = auth.uid()) DESC
  LIMIT 1;

  IF v_profile.id IS NOT NULL THEN
    NEW.sender_id := v_profile.id;
    NEW.sender_role := v_profile.role;
    -- Chỉ điền tên nếu client chưa cung cấp tên riêng hợp lệ (tránh ghi đè tên hiển thị tùy chỉnh).
    IF NEW.sender_name IS NULL OR NEW.sender_name = '' OR NEW.sender_name IN ('Cô Hương Xuân (Giáo viên)', 'Giáo viên', 'Cô ... (Giáo viên)') THEN
      NEW.sender_name := v_profile.full_name;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_messages_sender_role ON public.messages;
CREATE TRIGGER trg_messages_sender_role BEFORE INSERT OR UPDATE ON public.messages
  FOR EACH ROW EXECUTE FUNCTION public.set_message_sender_role();

CREATE INDEX IF NOT EXISTS idx_messages_sender_role ON public.messages (sender_role);


-- ===== 20261106000200_ensure_class_from_student.sql =====
-- Đồng bộ danh mục lớp: khi học sinh được gán một class_name chưa có trong public.classes,
-- tự tạo dòng lớp tương ứng để danh mục lớp không bị lệch với danh sách học sinh.
-- (Không dùng FOREIGN KEY để giữ tương thích dữ liệu cũ; xóa lớp vẫn không ảnh hưởng hồ sơ học sinh.)
CREATE OR REPLACE FUNCTION public.ensure_class_exists()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NEW.class_name IS NOT NULL AND btrim(NEW.class_name) <> '' THEN
    INSERT INTO public.classes (name) VALUES (btrim(NEW.class_name))
    ON CONFLICT (name) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_students_ensure_class ON public.students;
CREATE TRIGGER trg_students_ensure_class
  AFTER INSERT OR UPDATE OF class_name ON public.students
  FOR EACH ROW EXECUTE FUNCTION public.ensure_class_exists();

-- Backfill: bổ sung mọi lớp đang được dùng trong students nhưng chưa có trong classes.
INSERT INTO public.classes (name)
SELECT DISTINCT btrim(s.class_name)
FROM public.students AS s
WHERE s.class_name IS NOT NULL AND btrim(s.class_name) <> ''
ON CONFLICT (name) DO NOTHING;


-- ===== 20261106000300_students_require_class.sql =====
-- Bắt buộc học sinh thuộc một lớp rõ ràng: bỏ giá trị mặc định '11A1'.
-- Trước đây DEFAULT '11A1' khiến mọi hồ sơ tạo thiếu lớp đều bị "nhét" vào lớp 11A1.
ALTER TABLE public.students ALTER COLUMN class_name DROP DEFAULT;

-- Chặn lớp rỗng: mỗi học sinh phải có lớp (đã trim khoảng trắng).
ALTER TABLE public.students DROP CONSTRAINT IF EXISTS students_class_name_not_blank;
ALTER TABLE public.students
  ADD CONSTRAINT students_class_name_not_blank
  CHECK (btrim(class_name) <> '');
