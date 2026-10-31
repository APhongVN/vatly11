# Cổng học tập Vật lí 11 · Chuyên đề Tụ điện

Ứng dụng Next.js 16, Supabase và Gemini để quản lý hoạt động học, tài liệu, bài nộp, phản hồi và trao đổi trong lớp.

## Chạy trên máy phát triển

1. Cài Node.js LTS và chạy `npm install`.
2. Tạo `.env.local` từ `.env.example`, điền URL và anon key của Supabase cùng Gemini API key. Không đưa khóa vào Git; không dùng lại khóa đã từng có trong lịch sử repository.
3. Chạy `npm run dev` rồi mở `http://localhost:3000`.

Ứng dụng dùng Next.js 16, React 19, Supabase Auth/Storage/Database và Gemini. `SUPABASE_SERVICE_ROLE_KEY` chỉ được dùng ở server để chấm quiz và đọc rubric; không đặt khóa này ở biến `NEXT_PUBLIC_*`, không commit vào Git và chỉ cấu hình bằng secret manager của Render.

## Cơ sở dữ liệu và phân quyền

Migration mới nằm trong `supabase/migrations` theo thứ tự thời gian. Trước khi áp dụng lên project đang có dữ liệu, sao lưu database và đối chiếu schema thật; baseline hiện tạo các bảng còn thiếu nhưng không tự hợp nhất dữ liệu trùng hoặc xóa dữ liệu cũ. Không chạy migration trên production trước khi đã thử trên bản sao.

Sau khi kiểm thử bản sao, liên kết project Supabase bằng CLI rồi chạy `npx supabase db push`. Kiểm tra lại Auth, policies, Storage buckets và luồng tải tài liệu trước khi mở lớp.

### Cấp tài khoản

- Giáo viên: tạo người dùng trong Supabase Auth khi chủ dự án cho phép; sau đó đặt `profiles.role = 'teacher'` trong SQL Editor. Tài khoản giáo viên không được tự tạo bởi ứng dụng.
- Học sinh: tạo tài khoản Auth riêng, sau đó liên kết `students.auth_user_id` với UUID Auth của đúng học sinh. Tên hiển thị không được dùng làm định danh bảo mật.
- Trigger mặc định tạo profile vai trò `student`; không tin cậy role do người đăng ký tự gửi lên.

SQL Editor scripts được lưu trong `supabase/sql-editor`. Script cấp vai trò mẫu ở [supabase/sql-editor/set_teacher_role.sql](supabase/sql-editor/set_teacher_role.sql) có placeholder email; chỉ thay email sau khi xác minh tài khoản trong Supabase Auth. Script không chứa mật khẩu.

## Nội dung chương Tụ điện

Tài liệu nguồn có 14 hoạt động đánh số. Trên lộ trình web, các hoạt động 8–11 được gộp thành một hoạt động “Các thí nghiệm liên quan đến tụ điện”, nên hiển thị thành 11 hoạt động. Nội dung chi tiết được trích vào `src/lib/data/curriculum.json`; trang học sinh lọc đáp án và rubric dành cho giáo viên khỏi phần hiển thị.

Ví dụ liên kết học sinh đã được giáo viên xác minh (thay email đúng tài khoản):

```sql
UPDATE public.students AS s
SET auth_user_id = u.id
FROM auth.users AS u
WHERE u.email = 'hoc-sinh@example.edu.vn'
  AND s.id = 'UUID_HOC_SINH_DA_XAC_MINH';
```

## Quy trình kiểm tra trước khi dùng với lớp

- `npx tsc --noEmit`
- `npm run lint`
- `npm run build`
- Thử bằng hai tài khoản học sinh và một giáo viên: phân quyền, thêm/import danh sách, tải lên và tải lại tài liệu, gửi/xóa chat, tệp đính kèm, mở/đóng nhận bài, nộp bài, sửa/duyệt điểm và tải/xuất dữ liệu.
- Kiểm tra lại quyền truy cập bằng tài khoản không thuộc lớp và cửa sổ ẩn danh.

Mọi bài AI chỉ là gợi ý; trạng thái điểm trong database do giáo viên quản lý. Khi API AI lỗi, bài nộp phải tiếp tục ở trạng thái chờ chấm.
