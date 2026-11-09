-- ============================================================
-- XÓA SẠCH TOÀN BỘ DỮ LIỆU (reset về trạng thái "mới")
-- Giữ lại: schema (bảng/cột/trigger/RPC), tài khoản Supabase Auth
--   (gồm tài khoản giáo viên huongxuan@vatly.com đã tạo),
--   và bảng profiles của giáo viên.
-- ============================================================
-- Cảnh báo: KHÔNG khôi phục được dữ liệu đã xóa. Chỉ chạy khi chắc chắn.

BEGIN;

-- 1) Xóa dữ liệu động (bài làm, chat, điểm, câu hỏi, học sinh, lớp, học liệu)
TRUNCATE TABLE
  public.api_rate_limits,
  public.activity_evidence,
  public.activity_grading_guides,
  public.quiz_submission_duplicate_archive,
  public.quiz_submissions,
  public.quiz_question_keys,
  public.quiz_questions,
  public.quizzes,
  public.group_submissions,
  public.group_assignment_members,
  public.group_assignment_groups,
  public.group_assignments,
  public.capacitance_lab_settings,
  public.peer_instruction_votes,
  public.game_scores,
  public.messages,
  public.chat_settings,
  public.student_questions,
  public.submissions,
  public.course_enrollments,
  public.learning_resources,
  public.classes,
  public.students
CASCADE;

-- 2) Xóa tất cả hồ sơ học sinh (không phải giáo viên) trong profiles
DELETE FROM public.profiles WHERE role = 'student';

-- 3) Xóa sạch bộ đếm rate-limit cho mọi user (tránh "thao tác quá nhanh" sau khi reset)
TRUNCATE TABLE public.student_auth_rate_limits CASCADE;
TRUNCATE TABLE public.api_rate_limits CASCADE;

-- 4) Khôi phục chat_settings về mặc định (mở chat)
INSERT INTO public.chat_settings (id) VALUES (1)
ON CONFLICT (id) DO UPDATE SET is_muted = FALSE, muted_by = NULL;

COMMIT;

-- ============================================================
-- KẾT QUẢ: web sẽ trống hoàn toàn như "mới":
--   - Không còn học sinh, lớp, bài nộp, điểm, chat, câu hỏi...
--   - Giáo viên huongxuan@vatly.com vẫn đăng nhập được (nếu đã gán role teacher)
--   - Các bảng schema, RLS, trigger, RPC giữ nguyên
-- ============================================================