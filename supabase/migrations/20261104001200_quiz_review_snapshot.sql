-- Mục 13: lưu lại bài làm trắc nghiệm để học sinh xem lại sau khi nộp (như Azota).
-- review chứa đáp án đúng + giải thích TỪNG CÂU, chỉ ghi SAU KHI nộp thành công,
-- và RLS "student_read_own" chỉ cho học sinh đọc dòng của CHÍNH MÌNH sau khi đã nộp,
-- nên không lộ đáp án trước lúc làm bài.
ALTER TABLE public.quiz_submissions
  ADD COLUMN IF NOT EXISTS answers JSONB,
  ADD COLUMN IF NOT EXISTS review JSONB;

CREATE INDEX IF NOT EXISTS idx_quiz_submissions_student ON public.quiz_submissions (student_id, created_at DESC);