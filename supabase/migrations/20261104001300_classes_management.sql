-- Quản lý lớp học: danh mục lớp -> học sinh thuộc lớp.
-- Một học sinh thuộc đúng một lớp (students.class_name tham chiếu classes.name).

CREATE TABLE IF NOT EXISTS public.classes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  grade_level TEXT,
  school_year TEXT,
  homeroom_teacher TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_classes_name ON public.classes (name);

ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.classes FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.classes TO authenticated;
GRANT ALL ON public.classes TO service_role;

DROP POLICY IF EXISTS "classes_read_authenticated" ON public.classes;
CREATE POLICY "classes_read_authenticated"
  ON public.classes FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "classes_teacher_manage" ON public.classes;
CREATE POLICY "classes_teacher_manage"
  ON public.classes FOR ALL TO authenticated
  USING (public.is_teacher()) WITH CHECK (public.is_teacher());

-- Cập nhật updated_at khi sửa lớp.
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_classes_touch ON public.classes;
CREATE TRIGGER trg_classes_touch BEFORE UPDATE ON public.classes
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Đồng bộ: mọi class_name của học sinh đều phải có trong danh mục lớp (nếu bảng đã có dữ liệu).
-- Không chặn dữ liệu cũ; chỉ đảm bảo danh mục lớp dùng chung.
