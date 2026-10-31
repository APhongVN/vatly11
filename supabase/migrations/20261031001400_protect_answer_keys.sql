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