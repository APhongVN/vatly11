-- Mục 1: hỏi đáp cho phép học sinh đính kèm ảnh/video/link bên cạnh câu hỏi chữ.
-- attachment_path lưu đường dẫn tệp trong Supabase Storage (private).
-- attachment_url lưu liên kết ngoài http(s) do học sinh dán vào.
ALTER TABLE public.student_questions
  ADD COLUMN IF NOT EXISTS attachment_path TEXT,
  ADD COLUMN IF NOT EXISTS attachment_url TEXT,
  ADD COLUMN IF NOT EXISTS attachment_name TEXT;

CREATE INDEX IF NOT EXISTS idx_student_questions_attachment
  ON public.student_questions (attachment_path) WHERE attachment_path IS NOT NULL;