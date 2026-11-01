# Cổng học tập Vật lí 11 · Chuyên đề Tụ điện

Ứng dụng Next.js 16, Supabase và Gemini để quản lý hoạt động học, tài liệu, bài nộp, phản hồi và trao đổi trong lớp.

## Chạy trên máy phát triển

1. Cài Node.js LTS và chạy `npm install`.
2. Tạo `.env.local` từ `.env.example`, điền URL và anon key của Supabase cùng Gemini API key. Không đưa khóa vào Git; không dùng lại khóa đã từng xuất hiện trong lịch sử repository.
3. Chạy `npm run dev` rồi mở `http://localhost:3000`.

`SUPABASE_SERVICE_ROLE_KEY` chỉ dùng ở server cho giới hạn tần suất, chấm điểm, cấp tài khoản học sinh và một số thao tác quản trị. Chỉ đặt khóa trong secret manager của Render hoặc `.env.local` trên máy phát triển. Không đặt ở biến `NEXT_PUBLIC_*` và không commit khóa thật.

## Cơ sở dữ liệu và phân quyền

Migration nằm trong `supabase/migrations`. Trước khi áp dụng lên project đang có dữ liệu, sao lưu database và đối chiếu schema thật; migration baseline không tự hợp nhất dữ liệu trùng hoặc xóa dữ liệu cũ. Thử trên bản sao trước khi áp dụng production.

Có thể áp dụng migration qua Supabase CLI sau khi liên kết đúng project bằng `npx supabase link`, rồi chạy `npx supabase db push`. Render chỉ triển khai mã ứng dụng; việc cập nhật schema Supabase là bước riêng. Sau khi chạy migration, kiểm tra Auth, RLS, Storage buckets và luồng tải tài liệu.

Bản hiện tại có thêm các migration bắt buộc `20261031002700_rubric_document_import.sql`, `20261031002800_teacher_final_feedback.sql` và `20261031002900_submission_api_rate_limit.sql`. Chúng lần lượt lưu tệp gốc của ma trận chấm điểm, tách nhận xét cuối của giáo viên và bảo vệ các route nộp bài qua giới hạn tần suất phía server. Áp dụng toàn bộ theo thứ tự số trước khi mở tài khoản/lớp học thật.

Migration `20261101000200_group_assignment_classes.sql` bổ sung phạm vi lớp cho bài tập nhóm. Bài mới cần chọn một lớp hoặc tất cả lớp; bài cũ có `class_name` rỗng vẫn áp dụng cho toàn bộ danh sách. Áp dụng migration này trước khi sử dụng chức năng tạo hoặc chia lại nhóm theo lớp.
### Nhập và xuất ma trận chấm

Giáo viên có thể nhập `.docx`, `.xlsx`, `.pdf`, `.txt`, `.md`, `.csv` hoặc ảnh PNG/JPG/WebP khi tạo bài, sửa bài hay mở chấm điểm. Công thức Word được chuyển sang dạng xem được; PDF scan và ảnh dùng route OCR có xác thực. Mỗi file tối đa 10 MB; PDF đọc tối đa 30 trang và OCR tối đa 5 trang scan; nội dung trích tối đa 20.000 ký tự. Hệ thống giữ file gốc trong Storage riêng tư để giáo viên tải lại, còn báo cáo Excel có sheet **Ma trận chấm điểm** cho bài cá nhân và nhóm. Cô cần rà lại nội dung OCR/công thức trước khi chấm.

### Cấp tài khoản

- Giáo viên: tạo người dùng trong Supabase Auth, xác minh email rồi chạy script `supabase/sql-editor/set_teacher_role.sql` trong SQL Editor sau khi thay placeholder bằng email đã xác minh. Ứng dụng không cho phép người dùng tự đăng ký vai trò giáo viên.
- Học sinh: nhập danh sách tên ở trang giáo viên, sau đó chọn **Cấp tài khoản** trên từng hồ sơ. Tính năng yêu cầu migration `20261031002600_student_account_provisioning.sql` và `SUPABASE_SERVICE_ROLE_KEY` chỉ cấu hình phía server. Mật khẩu tạm ngẫu nhiên chỉ hiển thị một lần; học sinh phải đổi sang mật khẩu riêng trước khi vào lớp.
- Tài khoản học sinh Auth có sẵn cần được giáo viên xác minh rồi liên kết đúng `students.auth_user_id`; không liên kết chỉ dựa trên tên hiển thị.

Ví dụ liên kết tài khoản đã xác minh trong SQL Editor:

```sql
UPDATE public.students AS s
SET auth_user_id = u.id
FROM auth.users AS u
WHERE u.email = 'hoc-sinh@example.edu.vn'
  AND s.id = 'UUID_HOC_SINH_DA_XAC_MINH';
```

## Nội dung chương Tụ điện

Tài liệu nguồn có 14 hoạt động. Trên web, hoạt động 8–11 được gộp thành một hoạt động **Các thí nghiệm liên quan đến tụ điện**, nên chương hiển thị 11 hoạt động. Nội dung chi tiết nằm trong `src/lib/data/curriculum.json`; phần đáp án và rubric dành cho giáo viên được lọc khỏi trang học sinh.

Trên Windows, đối chiếu DOCX nguồn với nội dung web bằng PowerShell:

```powershell
.\scripts\verify-curriculum-source.ps1 -DocxPath "C:\path\to\BAN_NOI_DUNG_CU_THE_TUNG_HOAT_DONG_TU_DIEN_DE_LAP_TRINH.docx"
```

## Kiểm tra trước khi dùng với lớp

```powershell
npm run test:content
npx tsc --noEmit
npm run lint
npm run build
npm audit --omit=dev
```

Sau đó thử với hai tài khoản học sinh và một giáo viên: phân quyền, nhập danh sách, tải lên/tải xuống tài liệu, gửi/xóa chat có tệp đính kèm, mở/đóng nhận bài, nộp bài cá nhân/nhóm, duyệt điểm và xuất dữ liệu. Kiểm tra quyền truy cập bằng tài khoản ngoài lớp và cửa sổ ẩn danh.

Mọi điểm AI chỉ là gợi ý; giáo viên duyệt hoặc ghi đè điểm cuối. Khi AI lỗi, bài nộp phải ở trạng thái chờ chấm.

## Điều kiện phát hành an toàn

Không đẩy một ref có khóa thật trong lịch sử Git. Nếu khóa từng bị commit hoặc push, hãy thu hồi/đổi khóa trước, sau đó làm sạch lịch sử đã công khai; xóa file ở commit mới không thu hồi khóa cũ. Chạy `scripts/check-release-secrets.ps1` trên đúng ref cần phát hành và chỉ đẩy ref đã kiểm tra; không dùng `git push --all` hoặc `--mirror` khi repository còn các worktree/ref cũ.
