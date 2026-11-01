-- Public visitors need only published curriculum metadata; answer keys remain private.
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "activities_read_public" ON public.activities;
DROP POLICY IF EXISTS "activities_read_published_metadata" ON public.activities;
CREATE POLICY "activities_read_published_metadata"
  ON public.activities
  FOR SELECT
  TO anon
  USING (status IN ('available', 'locked', 'done'));

REVOKE SELECT ON public.activities FROM anon;
GRANT SELECT (
  id, title, description, phase, type, duration, status, deliverable,
  course_id, chapter_id, accepting_submissions, deadline
) ON public.activities TO anon;