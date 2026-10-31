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
