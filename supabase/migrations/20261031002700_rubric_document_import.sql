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
