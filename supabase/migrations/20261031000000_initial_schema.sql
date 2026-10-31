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
