-- Dọn schema CŨ trước khi chạy full_setup.sql trên một database đã có
-- cấu trúc khác baseline (ví dụ quizzes.id là uuid thay vì SERIAL).
-- CHỈ chạy khi database chưa có dữ liệu học sinh / bài nộp thật cần giữ.
-- Script này KHÔNG xóa tài khoản đăng nhập trong auth.users.

-- 1) Xóa các primary key function trigger có thể chặn bảng.
DROP TRIGGER IF EXISTS on_auth_user_created_profile ON auth.users;
DROP FUNCTION IF EXISTS public.create_student_profile() CASCADE;

-- 2) Xóa các bảng nghiệp vụ cũ (CASCADE xử lý khóa ngoại).
DROP TABLE IF EXISTS public.activity_group_members CASCADE;
DROP TABLE IF EXISTS public.activity_groups CASCADE;
DROP TABLE IF EXISTS public.group_submission_files CASCADE;
DROP TABLE IF EXISTS public.group_submissions CASCADE;
DROP TABLE IF EXISTS public.group_assignment_members CASCADE;
DROP TABLE IF EXISTS public.group_assignment_groups CASCADE;
DROP TABLE IF EXISTS public.group_assignments CASCADE;
DROP TABLE IF EXISTS public.submissions CASCADE;
DROP TABLE IF EXISTS public.quiz_question_keys CASCADE;
DROP TABLE IF EXISTS public.quiz_questions CASCADE;
DROP TABLE IF EXISTS public.quiz_submissions CASCADE;
DROP TABLE IF EXISTS public.quizzes CASCADE;
DROP TABLE IF EXISTS public.activity_evidence CASCADE;
DROP TABLE IF EXISTS public.activity_grading_guides CASCADE;
DROP TABLE IF EXISTS public.peer_instruction_votes CASCADE;
DROP TABLE IF EXISTS public.capacitance_lab_settings CASCADE;
DROP TABLE IF EXISTS public.student_questions CASCADE;
DROP TABLE IF EXISTS public.student_auth_rate_limits CASCADE;
DROP TABLE IF EXISTS public.api_rate_limits CASCADE;
DROP TABLE IF EXISTS public.learning_resources CASCADE;
DROP TABLE IF EXISTS public.messages CASCADE;
DROP TABLE IF EXISTS public.chat_settings CASCADE;
DROP TABLE IF EXISTS public.course_enrollments CASCADE;
DROP TABLE IF EXISTS public.students CASCADE;
DROP TABLE IF EXISTS public.activities CASCADE;
DROP TABLE IF EXISTS public.chapters CASCADE;
DROP TABLE IF EXISTS public.courses CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;

-- 3) Dọn các storage policy của dự án (nếu đã tạo trước đó) để tránh
--    lỗi "policy already exists" khi full_setup.sql tạo lại.
DROP POLICY IF EXISTS "class_work_read_authorized" ON storage.objects;
DROP POLICY IF EXISTS "class_work_upload_own" ON storage.objects;
DROP POLICY IF EXISTS "class_work_update_own_or_teacher" ON storage.objects;
DROP POLICY IF EXISTS "class_work_delete_own_or_teacher" ON storage.objects;
DROP POLICY IF EXISTS "videos_read_activity_document" ON storage.objects;
DROP POLICY IF EXISTS "videos_teacher_upload" ON storage.objects;
DROP POLICY IF EXISTS "videos_teacher_update" ON storage.objects;
DROP POLICY IF EXISTS "videos_teacher_delete" ON storage.objects;
DROP POLICY IF EXISTS "Published resource files are readable" ON storage.objects;
DROP POLICY IF EXISTS "Teachers upload learning resource files" ON storage.objects;
DROP POLICY IF EXISTS "Teachers update learning resource files" ON storage.objects;
DROP POLICY IF EXISTS "Teachers delete learning resource files" ON storage.objects;
DROP POLICY IF EXISTS "Teachers read learning resource files" ON storage.objects;
DROP POLICY IF EXISTS "learning_resource_objects_update" ON storage.objects;
DROP POLICY IF EXISTS "learning_resource_objects_delete" ON storage.objects;
DROP POLICY IF EXISTS "learning_resource_objects_insert" ON storage.objects;
DROP POLICY IF EXISTS "group_rubric_objects_read_members" ON storage.objects;
