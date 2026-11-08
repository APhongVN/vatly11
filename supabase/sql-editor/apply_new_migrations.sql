-- CHI AP DUNG 11 MIGRATION MOI (an toan, chay lai duoc).
-- DB co schema cu da chay xong thi chi can chay file nay.
-- Tung migration co DROP POLICY IF EXISTS + IF NOT EXISTS.

-- ============================================================
-- 20261104000100_student_questions.sql
-- ============================================================
-- "Góc hỏi đáp" question tracker (đặc tả 4.7).
-- Students raise a question with a topic and the teacher answers and updates the
-- handling status. Teachers can read every question; students can only read and
-- create their own.
CREATE TABLE IF NOT EXISTS public.student_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  topic TEXT NOT NULL,
  content TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'unanswered' CHECK (status IN ('unanswered', 'answered', 'resolved')),
  teacher_response TEXT,
  responder_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  responded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (char_length(btrim(content)) BETWEEN 5 AND 1500),
  CHECK (teacher_response IS NULL OR char_length(teacher_response) <= 3000),
  CHECK (status = 'unanswered' OR teacher_response IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS idx_student_questions_student_created
  ON public.student_questions (student_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_student_questions_status_created
  ON public.student_questions (status, created_at DESC);

ALTER TABLE public.student_questions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.student_questions FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.student_questions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.student_questions TO service_role;

DROP POLICY IF EXISTS "student_questions_student_read_own" ON public.student_questions;
CREATE POLICY "student_questions_student_read_own"
  ON public.student_questions FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.students s
    WHERE s.id = student_questions.student_id AND s.auth_user_id = auth.uid()
  ));

DROP POLICY IF EXISTS "student_questions_student_insert_own" ON public.student_questions;
CREATE POLICY "student_questions_student_insert_own"
  ON public.student_questions FOR INSERT TO authenticated
  WITH CHECK (
    status = 'unanswered'
    AND teacher_response IS NULL
    AND EXISTS (
      SELECT 1 FROM public.students s
      WHERE s.id = student_questions.student_id AND s.auth_user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "student_questions_teacher_manage" ON public.student_questions;
CREATE POLICY "student_questions_teacher_manage"
  ON public.student_questions FOR ALL TO authenticated
  USING (public.is_teacher()) WITH CHECK (public.is_teacher());

-- Keep the server-only rate-limit RPC in sync with the new bucket. This mirrors
-- the existing pattern of re-declaring consume_api_rate_limit so the whitelist
-- of allowed buckets stays single-sourced in the database.
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
    WHEN 'student-account' THEN 10
    WHEN 'account-password' THEN 6
    WHEN 'submission' THEN 12
    WHEN 'group-submission' THEN 12
    WHEN 'student-question' THEN 20
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


-- ============================================================
-- 20261104000200_learning_result_metrics.sql
-- ============================================================
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


-- ============================================================
-- 20261104000300_statement_game.sql
-- ============================================================
-- 4.5 Trò chơi "Truy tìm phát biểu sai": phát biểu, lượt chơi và điểm nhóm.
-- Mỗi phát biểu có một đáp án đúng/sai đã duyệt; học sinh chọn phát biểu sai,
-- giải thích lí do rồi nhấn "Kiểm tra". Hệ thống ghi nhận số câu đúng,
-- số lần thử và điểm của từng nhóm.
CREATE TABLE IF NOT EXISTS public.game_statements (
  id SERIAL PRIMARY KEY,
  statement TEXT NOT NULL,
  is_false BOOLEAN NOT NULL,
  explanation TEXT NOT NULL,
  topic TEXT NOT NULL DEFAULT 'capacitance',
  display_order INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS public.game_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID REFERENCES public.group_assignment_groups(id) ON DELETE CASCADE,
  student_id UUID REFERENCES public.students(id) ON DELETE CASCADE,
  correct_count INTEGER NOT NULL DEFAULT 0 CHECK (correct_count >= 0),
  attempt_count INTEGER NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
  score NUMERIC(5,2) NOT NULL DEFAULT 0 CHECK (score >= 0),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_game_scores_group ON public.game_scores (group_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_game_scores_student ON public.game_scores (student_id, updated_at DESC);

ALTER TABLE public.game_statements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_scores ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.game_statements FROM anon, authenticated;
REVOKE ALL ON public.game_scores FROM anon, authenticated;
GRANT SELECT ON public.game_statements TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.game_scores TO authenticated;
GRANT ALL ON public.game_statements, public.game_scores TO service_role;

DROP POLICY IF EXISTS "game_statements_read_authenticated" ON public.game_statements;
CREATE POLICY "game_statements_read_authenticated"
  ON public.game_statements FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "game_scores_student_read_own" ON public.game_scores;
CREATE POLICY "game_scores_student_read_own"
  ON public.game_scores FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.students s
    WHERE s.id = game_scores.student_id AND s.auth_user_id = auth.uid()
  ));

DROP POLICY IF EXISTS "game_scores_student_insert_own" ON public.game_scores;
CREATE POLICY "game_scores_student_insert_own"
  ON public.game_scores FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.students s
    WHERE s.id = game_scores.student_id AND s.auth_user_id = auth.uid()
  ));

DROP POLICY IF EXISTS "game_scores_teacher_manage" ON public.game_scores;
CREATE POLICY "game_scores_teacher_manage"
  ON public.game_scores FOR ALL TO authenticated
  USING (public.is_teacher()) WITH CHECK (public.is_teacher());

-- Seed phát biểu mẫu theo đặc tả 4.5 (đúng/sai đã duyệt).
INSERT INTO public.game_statements (statement, is_false, explanation, topic, display_order) VALUES
  ('Hai bản tụ điện sau khi được tích điện mang điện tích cùng dấu', true, 'Hai bản tụ mang điện tích trái dấu và có độ lớn bằng nhau.', 'charge', 1),
  ('Tụ điện gồm hai vật dẫn ngăn cách bởi môi trường cách điện', false, 'Đây là cấu tạo đúng của tụ điện phẳng.', 'structure', 2),
  ('Sau khi ngắt nguồn, tụ điện lí tưởng giữ nguyên điện tích', false, 'Mô hình lí tưởng bỏ qua rò điện nên điện tích giữ nguyên.', 'charge', 3),
  ('Điện dung của tụ phụ thuộc vào hiệu điện thế đặt vào hai đầu tụ', true, 'Điện dung do cấu tạo (S, d, εr) quyết định, không phụ thuộc U.', 'capacitance', 4),
  ('Tăng diện tích bản tụ thì điện dung tăng', false, 'C tỉ lệ thuận với diện tích bản tụ.', 'capacitance', 5),
  ('Tăng khoảng cách giữa hai bản tụ thì điện dung tăng', true, 'C tỉ lệ nghịch với khoảng cách d; tăng d thì C giảm.', 'capacitance', 6),
  ('Năng lượng tụ điện tỉ lệ với bình phương hiệu điện thế', false, 'W = 1/2 C U² nên năng lượng tỉ lệ với U².', 'energy', 7),
  ('Tụ trong flash máy ảnh tích trữ và giải phóng năng lượng nhanh', false, 'Đây là ứng dụng đúng của tụ điện.', 'energy', 8)
ON CONFLICT DO NOTHING;


-- ============================================================
-- 20261104000400_student_code.sql
-- ============================================================
-- Mục 4: lưu mã số sinh viên (MSSV) khi nhập danh sách từ tệp.
-- Nếu tệp không có cột mã thì để trống, giáo viên tự điền sau.
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS student_code TEXT;

CREATE INDEX IF NOT EXISTS idx_students_student_code
  ON public.students (LOWER(student_code)) WHERE student_code IS NOT NULL;

-- Số lượng lớp: đảm bảo truy vấn lọc theo lớp nhanh khi có nhiều lớp.
CREATE INDEX IF NOT EXISTS idx_students_class_name
  ON public.students (LOWER(class_name));


-- ============================================================
-- 20261104000500_password_changed.sql
-- ============================================================
-- Mục 5: theo dõi trạng thái đổi mật khẩu để bảo mật.
-- Sau khi học sinh đổi mật khẩu lần đầu, giáo viên không còn thấy mật khẩu
-- mà chỉ thấy trạng thái "Đã đổi mật khẩu".
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS password_changed BOOLEAN NOT NULL DEFAULT FALSE;

-- ============================================================
-- 20261104000600_chat_deletion_block.sql
-- ============================================================
-- Mục 8: chế độ cấm xóa tin nhắn trong kênh thảo luận.
-- Khi giáo viên bật deletion_blocked, học sinh không còn xóa được tin nhắn.
ALTER TABLE public.chat_settings ADD COLUMN IF NOT EXISTS deletion_blocked BOOLEAN NOT NULL DEFAULT FALSE;

DROP POLICY IF EXISTS "messages_delete_own_or_teacher" ON public.messages;
CREATE POLICY "messages_delete_own_or_teacher" ON public.messages FOR DELETE TO authenticated
  USING (
    public.is_teacher()
    OR (
      sender_id = auth.uid()
      AND EXISTS (SELECT 1 FROM public.chat_settings cs WHERE cs.id = 1 AND cs.deletion_blocked = FALSE)
    )
  );

-- ============================================================
-- 20261104000700_question_attachments.sql
-- ============================================================
-- Mục 1: hỏi đáp cho phép học sinh đính kèm ảnh/video/link bên cạnh câu hỏi chữ.
-- attachment_path lưu đường dẫn tệp trong Supabase Storage (private).
-- attachment_url lưu liên kết ngoài http(s) do học sinh dán vào.
ALTER TABLE public.student_questions
  ADD COLUMN IF NOT EXISTS attachment_path TEXT,
  ADD COLUMN IF NOT EXISTS attachment_url TEXT,
  ADD COLUMN IF NOT EXISTS attachment_name TEXT;

CREATE INDEX IF NOT EXISTS idx_student_questions_attachment
  ON public.student_questions (attachment_path) WHERE attachment_path IS NOT NULL;

-- ============================================================
-- 20261104000800_quiz_time_tracking.sql
-- ============================================================
-- Mục 7: lưu thời gian làm bài trắc nghiệm để giáo viên thống kê.
-- started_at do hệ thống ghi khi học sinh mở bài; time_spent_seconds do client
-- đo và gửi lên (máy chủ vẫn giới hạn trong khoảng hợp lệ).
ALTER TABLE public.quiz_submissions
  ADD COLUMN IF NOT EXISTS started_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS time_spent_seconds INTEGER CHECK (time_spent_seconds IS NULL OR time_spent_seconds >= 0);

CREATE INDEX IF NOT EXISTS idx_quiz_submissions_started ON public.quiz_submissions (quiz_id, started_at DESC);

-- ============================================================
-- 20261104000900_storage_bucket_limits.sql
-- ============================================================
-- Mục 4 & 9: đảm bảo bucket kho học liệu tồn tại với giới hạn 100 MB và nhận
-- mọi định dạng tệp (docx, pdf, video, ảnh...). Idempotent — chạy lại an toàn.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('learning-resources', 'learning-resources', FALSE, 104857600, NULL)
ON CONFLICT (id) DO UPDATE SET
  public = FALSE,
  file_size_limit = 104857600,
  allowed_mime_types = NULL;

-- Đảm bảo bucket bài làm/nộp bài cũng nhận tệp 100 MB.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('class-work', 'class-work', FALSE, 104857600, NULL)
ON CONFLICT (id) DO UPDATE SET
  public = FALSE,
  file_size_limit = 104857600;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('videos', 'videos', FALSE, 104857600, NULL)
ON CONFLICT (id) DO UPDATE SET
  public = FALSE,
  file_size_limit = 104857600;

-- ============================================================
-- 20261104001000_student_presence.sql
-- ============================================================
-- Mục 7: theo dõi trạng thái online/offline của học sinh.
-- last_seen_at được cập nhật mỗi khi học sinh hoạt động trên web;
-- coi là "đang online" nếu hoạt động trong vòng 5 phút gần nhất.
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_students_last_seen ON public.students (last_seen_at DESC);

-- ============================================================
-- 20261104001100_soft_delete_quizzes_groups.sql
-- ============================================================
-- Nút "Xóa + Hoàn tác" cho bài trắc nghiệm và bài tập nhóm dùng xóa MỀM:
-- xóa chỉ đánh dấu archived_at; hoàn tác bỏ đánh dấu, dữ liệu và kết quả làm bài
-- vẫn còn nguyên. Danh sách hiển thị lọc archived_at IS NULL.
ALTER TABLE public.quizzes ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;
ALTER TABLE public.group_assignments ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_quizzes_archived ON public.quizzes (archived_at);
CREATE INDEX IF NOT EXISTS idx_group_assignments_archived ON public.group_assignments (archived_at);

