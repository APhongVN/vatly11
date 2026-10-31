-- Restrict lesson-file reads to teachers and activities open to students.
CREATE INDEX IF NOT EXISTS idx_activities_document_url ON public.activities(document_url) WHERE document_url IS NOT NULL;
DROP POLICY IF EXISTS "videos_read_authenticated" ON storage.objects;
DROP POLICY IF EXISTS "videos_read_activity_document" ON storage.objects;
CREATE POLICY "videos_read_activity_document" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'videos'
    AND (
      public.is_teacher()
      OR EXISTS (
        SELECT 1 FROM public.activities a
        WHERE a.document_url = storage.objects.name
          AND a.status = 'available'
      )
    )
  );
