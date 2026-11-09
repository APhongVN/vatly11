-- "Ghi chú đáp án đúng của cô" cho bài tự luận:
-- Giáo viên nhập đáp án mẫu khi chấm; học sinh thấy sau khi bài được chấm (status = graded).
ALTER TABLE public.submissions
  ADD COLUMN IF NOT EXISTS teacher_model_answer TEXT;

ALTER TABLE public.submissions
  DROP CONSTRAINT IF EXISTS submissions_teacher_model_answer_length;
ALTER TABLE public.submissions
  ADD CONSTRAINT submissions_teacher_model_answer_length
  CHECK (teacher_model_answer IS NULL OR char_length(teacher_model_answer) <= 5000);

-- Bài nhóm cũng hỗ trợ đáp án mẫu của cô.
ALTER TABLE public.group_submissions
  ADD COLUMN IF NOT EXISTS teacher_model_answer TEXT;

ALTER TABLE public.group_submissions
  DROP CONSTRAINT IF EXISTS group_submissions_teacher_model_answer_length;
ALTER TABLE public.group_submissions
  ADD CONSTRAINT group_submissions_teacher_model_answer_length
  CHECK (teacher_model_answer IS NULL OR char_length(teacher_model_answer) <= 5000);

-- Học sinh chỉ đọc đáp án mẫu khi bài đã được chấm xong (đúng quy tắc: không lộ đáp án khi chưa chấm).
-- Policy đọc submissions của học sinh đã có; cột mới tự đi theo SELECT *. Ràng buộc hiển thị do app
-- (chưa graded thì không render). Trigger bảo vệ: học sinh không tự ghi đè cột này.
CREATE OR REPLACE FUNCTION public.protect_submission_teacher_columns()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF auth.role() = 'authenticated' AND NOT public.is_teacher() THEN
    NEW.teacher_model_answer := OLD.teacher_model_answer;
    NEW.teacher_feedback := OLD.teacher_feedback;
    NEW.final_score := OLD.final_score;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_submission_teacher_columns ON public.submissions;
CREATE TRIGGER trg_protect_submission_teacher_columns BEFORE UPDATE ON public.submissions
  FOR EACH ROW EXECUTE FUNCTION public.protect_submission_teacher_columns();

DROP TRIGGER IF EXISTS trg_protect_group_submission_teacher_columns ON public.group_submissions;
CREATE TRIGGER trg_protect_group_submission_teacher_columns BEFORE UPDATE ON public.group_submissions
  FOR EACH ROW EXECUTE FUNCTION public.protect_submission_teacher_columns();