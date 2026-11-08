-- Nút "Xóa + Hoàn tác" cho bài trắc nghiệm và bài tập nhóm dùng xóa MỀM:
-- xóa chỉ đánh dấu archived_at; hoàn tác bỏ đánh dấu, dữ liệu và kết quả làm bài
-- vẫn còn nguyên. Danh sách hiển thị lọc archived_at IS NULL.
ALTER TABLE public.quizzes ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;
ALTER TABLE public.group_assignments ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_quizzes_archived ON public.quizzes (archived_at);
CREATE INDEX IF NOT EXISTS idx_group_assignments_archived ON public.group_assignments (archived_at);