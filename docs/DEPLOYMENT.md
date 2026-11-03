# Triển khai an toàn: Oracle VPS + Cloudflare

## Kiến trúc đang dùng

Ứng dụng hiện là Next.js full-stack: giao diện, Server Components, Proxy và hàng chục API Route Handler nằm trong cùng một tiến trình Node.js. Vì vậy không thể đặt nguyên ứng dụng lên Cloudflare Pages dưới dạng static export: static export không chạy được các API tạo tài khoản, đăng nhập, chấm bài và endpoint dùng secret server.

**Cách phát hành phù hợp với mã hiện tại:** chạy toàn bộ Next.js trên Oracle VPS; dùng Cloudflare DNS/proxy, TLS và cache tài nguyên tĩnh ở phía trước. Không thay đổi cấu hình hay bucket Cloudflare R2.

Nếu bắt buộc phải host frontend trên Pages, cần tách các API/auth server sang VPS, đặt toàn bộ giao diện thành frontend độc lập gọi backend theo domain riêng, thêm CORS/CSRF và kiểm tra lại từng luồng. Đây là một lần tái cấu trúc khác, chưa được bật trong repo này. Cloudflare hiện hướng dự án Next.js full-stack mới tới Workers; tài liệu Cloudflare ghi Pages dành cho static export và hướng Next.js full-stack sang Workers ([Pages Next.js](https://developers.cloudflare.com/pages/framework-guides/nextjs/), [Next.js trên Workers](https://developers.cloudflare.com/workers/framework-guides/web-apps/nextjs/)).

## Kết nối Supabase từng bước

1. **Mở đúng project:** vào `https://supabase.com/dashboard`, chọn project của VatLy11 và xác nhận project ID trước khi sửa cấu hình.
2. **Lấy URL và publishable key:** mở Connect để sao chép Project URL + publishable key; hoặc vào Project Settings → API Keys. Đặt hai giá trị này vào `.env.local` trên máy dev với tên `NEXT_PUBLIC_SUPABASE_URL` và `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. Publishable key được phép ở frontend; RLS vẫn phải bảo vệ dữ liệu.
3. **Lấy secret key riêng cho server:** trong cùng trang API Keys tạo/sao chép secret key (`sb_secret_...`) và đặt tên `SUPABASE_SECRET_KEY` trên Oracle VPS. Không thêm tiền tố `NEXT_PUBLIC_`, không dán vào source hoặc Git. Không dùng lại key từng xuất hiện công khai; hãy rotate/thu hồi key cũ trước khi phát hành.
4. **Bật cấu hình Auth:** Authentication → Sign In / Providers → bật Email. Tắt đăng ký tự do nếu học sinh chỉ được giáo viên cấp. Học sinh mới được admin tạo với email-confirmed và buộc đổi mật khẩu tạm ở lần đăng nhập đầu.
5. **Tạo giáo viên:** Authentication → Users → Add user; tạo hoặc mời email giáo viên. Sau khi email đã xác minh, chạy script `supabase/sql-editor/set_teacher_role.sql` trong SQL Editor để cấp `profiles.role = 'teacher'`. Không cấp vai trò giáo viên qua metadata do người dùng tự sửa.
6. **Áp dụng schema:** trước tiên sao lưu project đang có dữ liệu. Dùng Supabase CLI đã đăng nhập, liên kết đúng project, xem danh sách migration remote, rồi đẩy các migration chưa chạy theo thứ tự. Migration username mới là `20261103000100_student_username_auth.sql`; nó thêm username, ngày sinh và giới hạn thử đăng nhập. Không chạy lại baseline lên database đã tồn tại mà chưa đối chiếu schema.
7. **Cấu hình miền email alias:** đặt `STUDENT_AUTH_EMAIL_DOMAIN` thành miền do bạn quản lý và có DNS MX/A hợp lệ. Auth dùng `student-<username>@<miền>` nội bộ để ánh xạ username; học sinh chỉ cần nhập username. Không dùng `example.com`, `.test`, `.invalid` hay một miền không phân giải được.
8. **Tạo file env:** sao chép `.env.example` thành `.env.local` ở máy dev; trên VPS nhập các biến qua secret manager/systemd environment. Không commit `.env.local`.
9. **Kiểm tra kết nối:** chạy `npm run build`, mở `/giao-vien` để xem giao diện tự do; sau khi có teacher session thật, thử tạo một học sinh, sao chép credential một lần, đăng nhập học sinh và đổi mật khẩu. Tài khoản test phải được tạo trong project của bạn; không dùng tài khoản giả hoặc mật khẩu đưa lên GitHub.

Ví dụ triển khai migration sau khi liên kết đúng project:

```powershell
npx supabase login
npx supabase link --project-ref <PROJECT_REF>
npx supabase migration list --remote
npx supabase db push --remote
```

Chỉ đẩy migration sau khi kiểm tra project ID và trạng thái migration remote. Supabase lưu lịch sử migration riêng với Git; không dùng `migration repair` để né lỗi schema khi chưa biết chính xác trạng thái database.
## Oracle VPS

Cài Node.js 22+, Git và Nginx. Clone đúng ref đã kiểm tra, sau đó:

```powershell
npm ci
npm run build
npm run start -- --hostname 127.0.0.1 --port 3000
```

Trong vận hành, chạy lệnh start bằng `systemd` hoặc PM2 để tự khởi động lại khi VPS reboot; đặt Nginx làm reverse proxy tới `127.0.0.1:3000`, cấp TLS qua Cloudflare Origin Certificate hoặc Let's Encrypt.

Tạo `.env.local` trên VPS hoặc dùng secret manager của máy chủ. Tối thiểu gồm:

```text
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SECRET_KEY=...
GEMINI_API_KEY=...
STUDENT_AUTH_EMAIL_DOMAIN=vatly11.com
```

Chỉ publishable/anon key có tiền tố `NEXT_PUBLIC_`. `SUPABASE_SECRET_KEY` và khóa Gemini là secret server, không đưa vào Git, image công khai, biến `NEXT_PUBLIC_*`, log hay HTML. Nếu secret từng xuất hiện trong Git history hoặc nội dung chia sẻ, thu hồi và thay mới trước khi phát hành.

## Cloudflare

1. Trỏ DNS domain tới IP Oracle VPS và bật proxy Cloudflare.
2. Chọn SSL/TLS **Full (strict)**; chặn truy cập trực tiếp vào cổng ứng dụng và để Nginx nhận HTTPS.
3. Cache chỉ tệp tĩnh (`/_next/static/*`, ảnh/font); bỏ qua cache cho HTML động, `/api/*`, `/login`, `/giao-vien`, `/hoc-sinh` và mọi response `Set-Cookie`.
4. Để Nginx chuyển tiếp IP qua `CF-Connecting-IP` hoặc thiết lập `X-Real-IP` từ kết nối Cloudflare đã xác thực. Endpoint đăng nhập chỉ lưu hash của địa chỉ dùng để giới hạn lượt thử, không lưu IP thô.

## Tài khoản học sinh

- Tạo thủ công hoặc import danh sách tối đa 500 hồ sơ/lượt trên giao diện giáo viên; mỗi yêu cầu tới API xử lý tối đa 100 em để trả kết quả từng dòng.
- Tên đăng nhập bỏ dấu, chữ thường, số; tên trùng được thêm hậu tố và được database bảo vệ bằng unique index. Supabase Auth cần email alias dùng một miền thật có DNS; đặt `STUDENT_AUTH_EMAIL_DOMAIN` theo miền do bạn quản lý. Alias chỉ dùng nội bộ để ánh xạ username, học sinh không đăng nhập bằng email.
- Backend tạo Supabase Auth user và liên kết với hồ sơ học sinh. Mật khẩu tạm ngẫu nhiên chỉ trả về một lần, không lưu plaintext; giáo viên cần sao chép/in ngay. Khi cần cấp lại, mật khẩu cũ bị thay và học sinh phải đổi ở lần kế tiếp.
- Đăng nhập được duy trì bằng cookie/session Supabase có refresh. Không dùng IP làm bằng chứng nhận dạng hoặc bí mật đăng nhập: IP có thể đổi, bị chia sẻ bởi cả lớp, hoặc bị giả mạo qua header cấu hình sai. Khi browser đã giữ cookie hợp lệ, mở lại cùng browser sẽ tự vào; logout xóa phiên.
- Giới hạn đăng nhập áp dụng theo username và địa chỉ mạng; địa chỉ chỉ được hash. Cần cấu hình proxy đáng tin cậy trước khi public endpoint.

## Kiểm tra trước khi phát hành

```powershell
npm run test:content
npx tsc --noEmit --incremental false
npm run lint
npm run build
npm audit --audit-level=high
```

Sau khi migration được áp dụng, thử với một tài khoản giáo viên thật và hai học sinh trên cửa sổ thường/ẩn danh: đăng nhập, đổi mật khẩu lần đầu, mở lại browser, logout, tạo một hồ sơ, nhập lô có một dòng lỗi, đăng nhập từng học sinh, xác nhận API từ tài khoản khác bị chặn. Kiểm tra migration/schema và service key trên máy chủ riêng; không thử production bằng cách in hoặc sao chép secret ra log.
