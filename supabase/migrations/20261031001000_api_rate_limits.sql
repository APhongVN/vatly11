CREATE TABLE IF NOT EXISTS public.api_rate_limits (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  bucket TEXT NOT NULL,
  window_started_at TIMESTAMPTZ NOT NULL,
  hit_count INTEGER NOT NULL CHECK (hit_count > 0),
  PRIMARY KEY (user_id, bucket)
);
ALTER TABLE public.api_rate_limits ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.api_rate_limits FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.consume_api_rate_limit(p_bucket TEXT, p_limit INTEGER, p_window_seconds INTEGER)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  current_user_id UUID := auth.uid();
  hits INTEGER;
  started TIMESTAMPTZ;
  v_current_time TIMESTAMPTZ := now();
BEGIN
  IF current_user_id IS NULL OR p_bucket !~ '^[a-z-]{1,32}$'
    OR p_limit < 1 OR p_limit > 300 OR p_window_seconds < 1 OR p_window_seconds > 3600 THEN
    RETURN FALSE;
  END IF;

  INSERT INTO public.api_rate_limits(user_id, bucket, window_started_at, hit_count)
  VALUES (current_user_id, p_bucket, v_current_time, 1)
  ON CONFLICT (user_id, bucket) DO UPDATE SET
    window_started_at = CASE
      WHEN EXCLUDED.window_started_at >= public.api_rate_limits.window_started_at + (p_window_seconds * interval '1 second')
      THEN EXCLUDED.window_started_at ELSE public.api_rate_limits.window_started_at END,
    hit_count = CASE
      WHEN EXCLUDED.window_started_at >= public.api_rate_limits.window_started_at + (p_window_seconds * interval '1 second')
      THEN 1 ELSE public.api_rate_limits.hit_count + 1 END
  RETURNING hit_count, window_started_at INTO hits, started;

  RETURN v_current_time < started + (p_window_seconds * interval '1 second') AND hits <= p_limit;
END;
$$;
REVOKE ALL ON FUNCTION public.consume_api_rate_limit(TEXT, INTEGER, INTEGER) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.consume_api_rate_limit(TEXT, INTEGER, INTEGER) TO authenticated;
