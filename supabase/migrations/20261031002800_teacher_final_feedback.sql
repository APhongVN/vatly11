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
