-- Teacher managed library for reusable files and external learning links.
CREATE TABLE IF NOT EXISTS public.learning_resources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  resource_type TEXT NOT NULL CHECK (resource_type IN ('file', 'link')),
  category TEXT NOT NULL DEFAULT 'Khác',
  tags TEXT[] NOT NULL DEFAULT '{}',
  storage_path TEXT UNIQUE,
  source_url TEXT,
  mime_type TEXT,
  file_size BIGINT,
  course_id UUID REFERENCES public.courses(id) ON DELETE SET NULL,
  chapter_id UUID REFERENCES public.chapters(id) ON DELETE SET NULL,
  activity_id INTEGER REFERENCES public.activities(id) ON DELETE SET NULL,
  is_published BOOLEAN NOT NULL DEFAULT FALSE,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL DEFAULT auth.uid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT resource_location_check CHECK (
    (resource_type = 'file' AND storage_path IS NOT NULL AND source_url IS NULL)
    OR (resource_type = 'link' AND source_url IS NOT NULL AND storage_path IS NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_learning_resources_activity ON public.learning_resources(activity_id, is_published, display_order);
CREATE INDEX IF NOT EXISTS idx_learning_resources_course_chapter ON public.learning_resources(course_id, chapter_id);
CREATE INDEX IF NOT EXISTS idx_learning_resources_category ON public.learning_resources(category);
CREATE INDEX IF NOT EXISTS idx_learning_resources_created_at ON public.learning_resources(created_at DESC);

ALTER TABLE public.learning_resources ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Published resources are readable" ON public.learning_resources
  FOR SELECT USING (is_published = TRUE);

CREATE POLICY "Teachers read all resources" ON public.learning_resources
  FOR SELECT TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'teacher');

CREATE POLICY "Teachers insert resources" ON public.learning_resources
  FOR INSERT TO authenticated
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') = 'teacher');

CREATE POLICY "Teachers update resources" ON public.learning_resources
  FOR UPDATE TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'teacher')
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') = 'teacher');

CREATE POLICY "Teachers delete resources" ON public.learning_resources
  FOR DELETE TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'teacher');

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('learning-resources', 'learning-resources', FALSE, 104857600, NULL)
ON CONFLICT (id) DO UPDATE SET public = FALSE, file_size_limit = 104857600, allowed_mime_types = NULL;

CREATE POLICY "Published resource files are readable" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'learning-resources'
    AND EXISTS (
      SELECT 1 FROM public.learning_resources r
      WHERE r.storage_path = storage.objects.name AND r.is_published = TRUE
    )
  );

CREATE POLICY "Teachers upload learning resource files" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'learning-resources'
    AND (auth.jwt() -> 'app_metadata' ->> 'role') = 'teacher'
  );

CREATE POLICY "Teachers update learning resource files" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'learning-resources'
    AND (auth.jwt() -> 'app_metadata' ->> 'role') = 'teacher'
  )
  WITH CHECK (
    bucket_id = 'learning-resources'
    AND (auth.jwt() -> 'app_metadata' ->> 'role') = 'teacher'
  );

CREATE POLICY "Teachers delete learning resource files" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'learning-resources'
    AND (auth.jwt() -> 'app_metadata' ->> 'role') = 'teacher'
  );
CREATE POLICY "Teachers read learning resource files" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'learning-resources'
    AND (auth.jwt() -> 'app_metadata' ->> 'role') = 'teacher'
  );
GRANT SELECT, INSERT, UPDATE, DELETE ON public.learning_resources TO authenticated;
