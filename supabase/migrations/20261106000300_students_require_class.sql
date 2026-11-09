-- Bắt buộc học sinh thuộc một lớp rõ ràng: bỏ giá trị mặc định '11A1'.
-- Trước đây DEFAULT '11A1' khiến mọi hồ sơ tạo thiếu lớp đều bị "nhét" vào lớp 11A1.
ALTER TABLE public.students ALTER COLUMN class_name DROP DEFAULT;

-- Chặn lớp rỗng: mỗi học sinh phải có lớp (đã trim khoảng trắng).
ALTER TABLE public.students DROP CONSTRAINT IF EXISTS students_class_name_not_blank;
ALTER TABLE public.students
  ADD CONSTRAINT students_class_name_not_blank
  CHECK (btrim(class_name) <> '');
