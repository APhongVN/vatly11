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
