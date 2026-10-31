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
