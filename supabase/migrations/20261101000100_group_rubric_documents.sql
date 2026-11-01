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
