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
