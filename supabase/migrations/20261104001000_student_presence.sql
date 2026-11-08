-- Mục 7: theo dõi trạng thái online/offline của học sinh.
-- last_seen_at được cập nhật mỗi khi học sinh hoạt động trên web;
-- coi là "đang online" nếu hoạt động trong vòng 5 phút gần nhất.
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_students_last_seen ON public.students (last_seen_at DESC);