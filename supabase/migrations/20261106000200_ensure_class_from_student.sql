-- Đồng bộ danh mục lớp: khi học sinh được gán một class_name chưa có trong public.classes,
-- tự tạo dòng lớp tương ứng để danh mục lớp không bị lệch với danh sách học sinh.
-- (Không dùng FOREIGN KEY để giữ tương thích dữ liệu cũ; xóa lớp vẫn không ảnh hưởng hồ sơ học sinh.)
CREATE OR REPLACE FUNCTION public.ensure_class_exists()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NEW.class_name IS NOT NULL AND btrim(NEW.class_name) <> '' THEN
    INSERT INTO public.classes (name) VALUES (btrim(NEW.class_name))
    ON CONFLICT (name) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_students_ensure_class ON public.students;
CREATE TRIGGER trg_students_ensure_class
  AFTER INSERT OR UPDATE OF class_name ON public.students
  FOR EACH ROW EXECUTE FUNCTION public.ensure_class_exists();

-- Backfill: bổ sung mọi lớp đang được dùng trong students nhưng chưa có trong classes.
INSERT INTO public.classes (name)
SELECT DISTINCT btrim(s.class_name)
FROM public.students AS s
WHERE s.class_name IS NOT NULL AND btrim(s.class_name) <> ''
ON CONFLICT (name) DO NOTHING;
