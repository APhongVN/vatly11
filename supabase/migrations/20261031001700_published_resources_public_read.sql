-- Published curriculum resources are intentionally readable in the public,
-- no-account preview. Drafts and all write operations remain teacher-only.
GRANT SELECT ON public.learning_resources TO anon, authenticated;

DROP POLICY IF EXISTS "resources_read_published_or_teacher" ON public.learning_resources;
CREATE POLICY "resources_read_published_or_teacher"
  ON public.learning_resources FOR SELECT TO anon, authenticated
  USING (is_published OR (auth.uid() IS NOT NULL AND public.is_teacher()));

DROP POLICY IF EXISTS "learning_resource_objects_read" ON storage.objects;
CREATE POLICY "learning_resource_objects_read"
  ON storage.objects FOR SELECT TO anon, authenticated
  USING (
    bucket_id = 'learning-resources'
    AND (
      EXISTS (
        SELECT 1 FROM public.learning_resources r
        WHERE r.storage_path = storage.objects.name AND r.is_published
      )
      OR (auth.uid() IS NOT NULL AND public.is_teacher())
    )
  );
