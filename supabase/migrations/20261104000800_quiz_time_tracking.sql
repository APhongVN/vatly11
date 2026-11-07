-- Mục 7: lưu thời gian làm bài trắc nghiệm để giáo viên thống kê.
-- started_at do hệ thống ghi khi học sinh mở bài; time_spent_seconds do client
-- đo và gửi lên (máy chủ vẫn giới hạn trong khoảng hợp lệ).
ALTER TABLE public.quiz_submissions
  ADD COLUMN IF NOT EXISTS started_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS time_spent_seconds INTEGER CHECK (time_spent_seconds IS NULL OR time_spent_seconds >= 0);

CREATE INDEX IF NOT EXISTS idx_quiz_submissions_started ON public.quiz_submissions (quiz_id, started_at DESC);