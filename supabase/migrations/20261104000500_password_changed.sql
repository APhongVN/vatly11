-- Mục 5: theo dõi trạng thái đổi mật khẩu để bảo mật.
-- Sau khi học sinh đổi mật khẩu lần đầu, giáo viên không còn thấy mật khẩu
-- mà chỉ thấy trạng thái "Đã đổi mật khẩu".
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS password_changed BOOLEAN NOT NULL DEFAULT FALSE;