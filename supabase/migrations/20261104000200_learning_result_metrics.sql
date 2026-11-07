-- 4.8 Kết quả học tập của học sinh: bổ sung các chỉ số theo dõi.
-- Các chỉ số chỉ được tính từ dữ liệu thật do website ghi nhận (đặc tả 4.8),
-- không điền sẵn giá trị giả định.
ALTER TABLE public.activity_evidence
  ADD COLUMN IF NOT EXISTS first_attempt_correct BOOLEAN,
  ADD COLUMN IF NOT EXISTS correct_after_hint BOOLEAN,
  ADD COLUMN IF NOT EXISTS attempts_count INTEGER NOT NULL DEFAULT 1 CHECK (attempts_count >= 1),
  ADD COLUMN IF NOT EXISTS hint_count INTEGER NOT NULL DEFAULT 0 CHECK (hint_count >= 0),
  ADD COLUMN IF NOT EXISTS review_topics TEXT[] NOT NULL DEFAULT '{}';

CREATE INDEX IF NOT EXISTS idx_activity_evidence_first_attempt
  ON public.activity_evidence (student_id, first_attempt_correct) WHERE first_attempt_correct IS NOT NULL;
