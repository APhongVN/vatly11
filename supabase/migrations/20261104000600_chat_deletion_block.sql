-- Mục 8: chế độ cấm xóa tin nhắn trong kênh thảo luận.
-- Khi giáo viên bật deletion_blocked, học sinh không còn xóa được tin nhắn.
ALTER TABLE public.chat_settings ADD COLUMN IF NOT EXISTS deletion_blocked BOOLEAN NOT NULL DEFAULT FALSE;

DROP POLICY IF EXISTS "messages_delete_own_or_teacher" ON public.messages;
CREATE POLICY "messages_delete_own_or_teacher" ON public.messages FOR DELETE TO authenticated
  USING (
    public.is_teacher()
    OR (
      sender_id = auth.uid()
      AND EXISTS (SELECT 1 FROM public.chat_settings cs WHERE cs.id = 1 AND cs.deletion_blocked = FALSE)
    )
  );