ALTER TABLE public.learning_resources ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Published resources are readable" ON public.learning_resources;
DROP POLICY IF EXISTS "Teachers read all resources" ON public.learning_resources;
DROP POLICY IF EXISTS "Teachers insert resources" ON public.learning_resources;
DROP POLICY IF EXISTS "Teachers update resources" ON public.learning_resources;
DROP POLICY IF EXISTS "Teachers delete resources" ON public.learning_resources;
CREATE POLICY "resources_read_published_or_teacher" ON public.learning_resources FOR SELECT TO authenticated
  USING (is_published OR public.is_teacher());
CREATE POLICY "resources_teacher_insert" ON public.learning_resources FOR INSERT TO authenticated
  WITH CHECK (public.is_teacher());
CREATE POLICY "resources_teacher_update" ON public.learning_resources FOR UPDATE TO authenticated
  USING (public.is_teacher()) WITH CHECK (public.is_teacher());
CREATE POLICY "resources_teacher_delete" ON public.learning_resources FOR DELETE TO authenticated
  USING (public.is_teacher());

DROP POLICY IF EXISTS "Teachers upload learning resource files" ON storage.objects;
DROP POLICY IF EXISTS "Teachers update learning resource files" ON storage.objects;
DROP POLICY IF EXISTS "Teachers delete learning resource files" ON storage.objects;
DROP POLICY IF EXISTS "Teachers read learning resource files" ON storage.objects;
DROP POLICY IF EXISTS "Published resource files are readable" ON storage.objects;
CREATE POLICY "learning_resource_objects_read" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'learning-resources' AND (public.is_teacher() OR EXISTS (
    SELECT 1 FROM public.learning_resources r WHERE r.storage_path = storage.objects.name AND r.is_published
  )));
CREATE POLICY "learning_resource_objects_insert" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'learning-resources' AND public.is_teacher());
CREATE POLICY "learning_resource_objects_update" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'learning-resources' AND public.is_teacher())
  WITH CHECK (bucket_id = 'learning-resources' AND public.is_teacher());
CREATE POLICY "learning_resource_objects_delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'learning-resources' AND public.is_teacher());
