-- Username đăng nhập học sinh; mật khẩu tạm chỉ trả về một lần, không lưu trong database.
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS username TEXT;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS birth_date DATE;

-- Tài khoản cũ vẫn đăng nhập được; gán username kỹ thuật ổn định cho hồ sơ đã tồn tại.
UPDATE public.students
SET username = 'hs' || LEFT(REPLACE(id::text, '-', ''), 12)
WHERE username IS NULL OR BTRIM(username) = '';

CREATE UNIQUE INDEX IF NOT EXISTS idx_students_username_unique
  ON public.students (LOWER(username)) WHERE username IS NOT NULL;
ALTER TABLE public.students ALTER COLUMN username SET NOT NULL;

-- Chỉ lưu hash định danh ngắn hạn; không lưu IP hoặc mật khẩu thô.
CREATE TABLE IF NOT EXISTS public.student_auth_rate_limits (
  subject_hash TEXT PRIMARY KEY CHECK (subject_hash ~ '^[a-f0-9]{64}$'),
  window_started_at TIMESTAMPTZ NOT NULL,
  hit_count INTEGER NOT NULL CHECK (hit_count > 0)
);
ALTER TABLE public.student_auth_rate_limits ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.student_auth_rate_limits FROM PUBLIC, anon, authenticated;

CREATE INDEX IF NOT EXISTS idx_student_auth_rate_limits_window ON public.student_auth_rate_limits(window_started_at);

CREATE OR REPLACE FUNCTION public.consume_student_auth_rate_limit(
  p_subject_hash TEXT,
  p_limit INTEGER DEFAULT 8,
  p_window_seconds INTEGER DEFAULT 600
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  hits INTEGER;
  started TIMESTAMPTZ;
  v_now TIMESTAMPTZ := now();
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role'
    OR p_subject_hash IS NULL
    OR p_subject_hash !~ '^[a-f0-9]{64}$'
    OR p_limit IS NULL OR p_limit NOT IN (8, 30)
    OR p_window_seconds IS DISTINCT FROM 600 THEN
    RETURN FALSE;
  END IF;

  DELETE FROM public.student_auth_rate_limits
  WHERE window_started_at < v_now - interval '24 hours';

  INSERT INTO public.student_auth_rate_limits(subject_hash, window_started_at, hit_count)
  VALUES (p_subject_hash, v_now, 1)
  ON CONFLICT (subject_hash) DO UPDATE SET
    window_started_at = CASE
      WHEN EXCLUDED.window_started_at >= public.student_auth_rate_limits.window_started_at + interval '600 seconds'
      THEN EXCLUDED.window_started_at ELSE public.student_auth_rate_limits.window_started_at END,
    hit_count = CASE
      WHEN EXCLUDED.window_started_at >= public.student_auth_rate_limits.window_started_at + interval '600 seconds'
      THEN 1 ELSE public.student_auth_rate_limits.hit_count + 1 END
  RETURNING hit_count, window_started_at INTO hits, started;

  RETURN v_now < started + interval '600 seconds' AND hits <= p_limit;
END;
$$;

REVOKE ALL ON FUNCTION public.consume_student_auth_rate_limit(TEXT, INTEGER, INTEGER) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.consume_student_auth_rate_limit(TEXT, INTEGER, INTEGER) TO service_role;
