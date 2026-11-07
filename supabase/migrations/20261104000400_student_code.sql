-- Mục 4: lưu mã số sinh viên (MSSV) khi nhập danh sách từ tệp.
-- Nếu tệp không có cột mã thì để trống, giáo viên tự điền sau.
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS student_code TEXT;

CREATE INDEX IF NOT EXISTS idx_students_student_code
  ON public.students (LOWER(student_code)) WHERE student_code IS NOT NULL;

-- Số lượng lớp: đảm bảo truy vấn lọc theo lớp nhanh khi có nhiều lớp.
CREATE INDEX IF NOT EXISTS idx_students_class_name
  ON public.students (LOWER(class_name));
