-- Phân biệt vai trò người gửi trong kênh thảo luận.
-- Trước đây app đoán giáo viên qua tên hiển thị ("Cô ..."/"(Giáo viên)") nên hiển thị sai khi tên khác quy ước.
-- Cột sender_role do DB/trigger gán theo profiles.role của auth.uid(), KHÔNG tin dữ liệu client gửi lên.
ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS sender_role TEXT;

ALTER TABLE public.messages
  DROP CONSTRAINT IF EXISTS messages_sender_role_check;
ALTER TABLE public.messages
  ADD CONSTRAINT messages_sender_role_check
  CHECK (sender_role IS NULL OR sender_role IN ('teacher', 'student'));

-- Backfill dữ liệu cũ từ profiles (chỉ khi có sender_id).
UPDATE public.messages AS m
SET sender_role = p.role
FROM public.profiles AS p
WHERE m.sender_id = p.id AND m.sender_role IS NULL AND p.role IN ('teacher', 'student');

-- Trigger: mọi tin nhắn mới luôn được gán theo hồ sơ của người đăng nhập (auth.uid()),
-- nên client không cần (và không thể) tự đặt tên/vai trò/người gửi một cách thiếu nhất quán.
CREATE OR REPLACE FUNCTION public.set_message_sender_role()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_profile RECORD;
BEGIN
  -- Lấy hồ sơ của người đang đăng nhập (ưu tiên auth.uid(); giữ sender_id cũ nếu có).
  SELECT p.id, p.role, p.full_name
    INTO v_profile
  FROM public.profiles AS p
  WHERE p.id = NEW.sender_id
     OR p.id = auth.uid()
  ORDER BY (p.id = NEW.sender_id) DESC, (p.id = auth.uid()) DESC
  LIMIT 1;

  IF v_profile.id IS NOT NULL THEN
    NEW.sender_id := v_profile.id;
    NEW.sender_role := v_profile.role;
    -- Chỉ điền tên nếu client chưa cung cấp tên riêng hợp lệ (tránh ghi đè tên hiển thị tùy chỉnh).
    IF NEW.sender_name IS NULL OR NEW.sender_name = '' OR NEW.sender_name IN ('Cô Hương Xuân (Giáo viên)', 'Giáo viên', 'Cô ... (Giáo viên)') THEN
      NEW.sender_name := v_profile.full_name;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_messages_sender_role ON public.messages;
CREATE TRIGGER trg_messages_sender_role BEFORE INSERT OR UPDATE ON public.messages
  FOR EACH ROW EXECUTE FUNCTION public.set_message_sender_role();

CREATE INDEX IF NOT EXISTS idx_messages_sender_role ON public.messages (sender_role);
