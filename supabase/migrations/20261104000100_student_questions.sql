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
    WHEN 'account-password' THEN 6
    WHEN 'submission' THEN 12
    WHEN 'group-submission' THEN 12
    WHEN 'student-question' THEN 20
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
