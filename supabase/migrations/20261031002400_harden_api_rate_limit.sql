-- Move rate-limit accounting behind the server-only service role.
-- The previous authenticated RPC accepted arbitrary buckets and caller-chosen limits.
DROP FUNCTION IF EXISTS public.consume_api_rate_limit(TEXT, INTEGER, INTEGER);

CREATE OR REPLACE FUNCTION public.consume_api_rate_limit(
  p_user_id UUID,
  p_bucket TEXT,
  p_limit INTEGER,
  p_window_seconds INTEGER
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  expected_limit INTEGER;
  hits INTEGER;
  started TIMESTAMPTZ;
  v_now TIMESTAMPTZ := now();
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role'
    OR p_user_id IS NULL
    OR p_bucket IS NULL
    OR p_limit IS NULL
    OR p_window_seconds IS DISTINCT FROM 60 THEN
    RETURN FALSE;
  END IF;

  expected_limit := CASE p_bucket
    WHEN 'activity-evidence' THEN 120
    WHEN 'capacitance-lab-settings' THEN 120
    WHEN 'file-download' THEN 120
    WHEN 'peer-votes' THEN 30
    WHEN 'chat' THEN 12
    WHEN 'grade' THEN 8
    WHEN 'ocr' THEN 10
    WHEN 'quiz' THEN 10
    WHEN 'analytics' THEN 5
    WHEN 'readiness-analysis' THEN 5
    ELSE NULL
  END;
  IF expected_limit IS NULL OR p_limit < 1 OR p_limit > expected_limit THEN
    RETURN FALSE;
  END IF;

  INSERT INTO public.api_rate_limits(user_id, bucket, window_started_at, hit_count)
  VALUES (p_user_id, p_bucket, v_now, 1)
  ON CONFLICT (user_id, bucket) DO UPDATE SET
    window_started_at = CASE
      WHEN EXCLUDED.window_started_at >= public.api_rate_limits.window_started_at + interval '60 seconds'
      THEN EXCLUDED.window_started_at ELSE public.api_rate_limits.window_started_at END,
    hit_count = CASE
      WHEN EXCLUDED.window_started_at >= public.api_rate_limits.window_started_at + interval '60 seconds'
      THEN 1 ELSE public.api_rate_limits.hit_count + 1 END
  RETURNING hit_count, window_started_at INTO hits, started;

  RETURN v_now < started + interval '60 seconds' AND hits <= p_limit;
END;
$$;

REVOKE ALL ON FUNCTION public.consume_api_rate_limit(UUID, TEXT, INTEGER, INTEGER) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.consume_api_rate_limit(UUID, TEXT, INTEGER, INTEGER) TO service_role;
