DROP POLICY IF EXISTS "activities_read_public" ON public.activities;
REVOKE SELECT ON public.activities FROM anon;
