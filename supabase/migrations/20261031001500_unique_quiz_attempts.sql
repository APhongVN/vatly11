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
