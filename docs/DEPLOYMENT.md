# Triển khai VatLy11: Render Web Service + Supabase

## 📌 Sổ tay vận hành nhanh (làm theo 5 bước)

Đây là checklist cô làm **một lần** để website chạy 24/24 trên `https://vatly11-tudien.onrender.com`.

### Bước 1 — Áp toàn bộ database (làm 1 lần)
Mở Supabase SQL Editor → dán toàn bộ file `supabase/sql-editor/full_setup.sql` (đã gộp **đủ 50 migration**: 26 bảng, RLS, rate-limit, trò chơi phát biểu, chỉ số kết quả, chọn lớp, online/offline, xóa mềm, lưu bài đã làm).

```powershell
Get-Content .\supabase\sql-editor\full_setup.sql -Raw | Set-Clipboard
# Dán vào https://supabase.com/dashboard/project/<PROJECT_REF>/sql/new rồi Run
```
Kiểm tra: `SELECT count(*) FROM information_schema.tables WHERE table_schema='public';` → mong đợi **30+ bảng**.

### Bước 2 — Cấp quyền giáo viên (làm 1 lần)
Supabase → Authentication → Users → **Add user** (email thật của cô + tick *Auto Confirm*). Sau đó chạy `supabase/sql-editor/set_teacher_role.sql` trong SQL Editor (thay email placeholder thành email giáo viên).

### Bước 3 — Cấu hình Render (một lần)
Mở Render Dashboard → Environment, điền đúng 5 biến (giá trị của **cùng 1** Supabase project):

| Biến | Ví dụ |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | `https://nlfobhufcuizwarfyfjn.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | `sb_publishable_...` |
| `SUPABASE_SECRET_KEY` | `sb_secret_...` |
| `GEMINI_API_KEY` | `AQ.Ab8RN6K...` |
| `STUDENT_AUTH_EMAIL_DOMAIN` | `vatly.com` |

Bấm **Save, rebuild, and deploy**. Nếu vừa đổi khóa Supabase, phải thay **đồng thời** publishable + secret.

### Bước 4 — Kiểm tra web chạy
- `https://vatly11-tudien.onrender.com/api/health` → mong đợi `status: "ok"` (hoặc `degraded` kèm chi tiết dependency).
- `https://vatly11-tudien.onrender.com/api/public-curriculum` → HTTP 200, JSON có `activities`.
- Nếu HTTP 503 / `Invalid API key` → URL và 2 khóa Supabase **không cùng project** hoặc key cũ bị thu hồi; xem lại Bước 1–3.

### Bước 5 — Vận hành hằng ngày
1. Đăng nhập **giáo viên** tại `/login` (tab Giáo viên, email + mật khẩu).
2. **Danh sách sinh viên** → nhập tên (tự in hoa, xếp A–Z) hoặc **nhập file** (tự nhận cột Họ tên + Mã SV) → **Cấp tài khoản** → sao chép/xuất Excel.
3. **Cổng học tập** → chọn bài học, video, quiz, PhET, nhóm, phiếu; **Chấm điểm** → AI chấm tự luận; **Xuất báo cáo Excel** (chưa làm = 0đ).
4. **Kênh thảo luận** 100MB, giáo viên khóa chat; **Góc hỏi đáp** kèm ảnh/video/link, gợi ý AI.
5. **Kho tài liệu** (ảnh/video/đề/rubric, cảnh báo dung lượng). Trắc nghiệm/bài nhóm có **sửa – xóa mềm – hoàn tác – thùng rác**.

## Kiến trúc đang dùng

VatLy11 là ứng dụng Next.js full-stack: trang server-rendered, Proxy, API xác thực, nộp bài, chấm điểm, import/export và Storage. Phải chạy bằng Node.js trên **Render Web Service** hoặc máy chủ Node tương đương; không chọn Static Site/Static Export vì các API và khóa server cần tiến trình Node. Hướng dẫn Oracle VPS bên dưới là phương án thay thế.



## Triển khai trên Render

1. Trong Render Dashboard, mở Web Service đang nối với `APhongVN/vatly11`, kiểm tra nhánh triển khai là `main` và bật Auto-Deploy nếu muốn mỗi lần push tự phát hành.
2. Trong **Settings**, dùng Runtime `Node`; Build Command `npm ci && npm run build`; Start Command `npm start`. Không đặt Publish Directory và không chuyển service thành Static Site. Repository yêu cầu Node.js 22 trở lên.
3. Mở **Environment** và đặt các biến sau bằng giá trị của cùng một Supabase project:

   | Biến | Giá trị lấy từ đâu | Phạm vi |
   | --- | --- | --- |
   | `NEXT_PUBLIC_SUPABASE_URL` | Connect → Project URL | Được đưa ra trình duyệt |
   | `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Connect hoặc Settings → API Keys; dạng `sb_publishable_...` | Khóa công khai, quyền dữ liệu do RLS quyết định |
   | `SUPABASE_SECRET_KEY` | Settings → API Keys; dạng `sb_secret_...` | Chỉ server; không thêm tiền tố `NEXT_PUBLIC_` |
   | `GEMINI_API_KEY` | Google AI Studio | Chỉ server |
   | `GEMINI_MODELS` (tuỳ chọn) | Id model Gemini cách nhau bằng dấu phẩy, thử theo thứ tự | Chỉ server; để trống dùng danh sách mặc định trong `src/lib/gemini-config.ts` |
   | `GEMINI_INPUT_COST_PER_M`, `GEMINI_OUTPUT_COST_PER_M` (tuỳ chọn) | USD cho mỗi 1 triệu token theo bảng giá Gemini của bạn; chỉ dùng để ước tính chi phí trong log `[gemini]` | Chỉ server; để trống dùng mặc định 0.5 (input) / 3.0 (output) |
   | `STUDENT_AUTH_EMAIL_DOMAIN` | Miền email do cô quản lý, có DNS | Dùng cho tài khoản username học sinh |

4. Bấm **Save, rebuild, and deploy** sau khi thay biến. Nếu vừa đổi/thu hồi khóa Supabase cũ, phải thay đồng thời publishable key và server secret trong Render; redeploy xong mới kiểm tra.
5. Mở **Events/Logs** để xác nhận deploy chạy `npm start` thành công. Kiểm tra `https://<ten-service>.onrender.com/api/health`: cần trả HTTP 200 với `status` là `ok` (hoặc `degraded` kèm từng dependency rõ tên). Kiểm tra `https://<ten-service>.onrender.com/api/public-curriculum`: cần trả HTTP 200 và JSON có `activities`. HTTP 503 hoặc log `Invalid API key` nghĩa là URL/key không cùng project, key cũ đã bị thu hồi, hoặc migration/RLS chưa áp dụng.
6. Mở `/hoc-sinh` và `/hoat-dong/8` để kiểm tra nội dung học; đăng nhập giáo viên thật rồi thử tạo tài liệu, nhóm, import rubric và xuất Excel. Bản xem công khai không tạo điểm hay hồ sơ học sinh giả.

Tài liệu chính thức: [Deploy Next.js trên Render](https://render.com/docs/deploy-nextjs-app), [Environment Variables của Render](https://render.com/docs/configure-environment-variables), [Supabase API Keys](https://supabase.com/docs/guides/getting-started/api-keys).
## Kết nối Supabase từng bước

1. **Mở đúng project:** vào `https://supabase.com/dashboard`, chọn project của VatLy11 và xác nhận project ID trước khi sửa cấu hình.
2. **Lấy URL và publishable key:** trong cùng project, mở Connect hoặc Settings → API Keys và sao chép Project URL cùng key `sb_publishable_...`. Trên máy dev lưu thành `NEXT_PUBLIC_SUPABASE_URL` và `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` trong `.env.local`. Publishable key có thể ở frontend; RLS vẫn phải bảo vệ dữ liệu.
3. **Lấy secret key riêng cho server:** trong cùng trang API Keys tạo/sao chép secret key (`sb_secret_...`) và đặt tên `SUPABASE_SECRET_KEY` trong Render Environment. Không thêm tiền tố `NEXT_PUBLIC_`, không dán vào source hoặc Git. Không dùng lại key từng xuất hiện công khai; hãy rotate/thu hồi key cũ trước khi phát hành.
4. **Đồng bộ database:** sao lưu project trước khi sửa. Cài Supabase CLI, đăng nhập bằng `npx supabase login`, lấy project ref ở URL Dashboard dạng `/project/<PROJECT_REF>`, chạy `npx supabase link --project-ref <PROJECT_REF>`, xem `npx supabase migration list --remote`, rồi áp dụng migration còn thiếu bằng `npx supabase db push --remote`. Kiểm tra project ref và danh sách trước khi xác nhận.
5. **Bật Auth:** Authentication → Sign In / Providers → bật Email. Tắt đăng ký tự do nếu chỉ giáo viên cấp học sinh. Học sinh được tạo với email-confirmed và buộc đổi mật khẩu tạm ở lần đăng nhập đầu.
6. **Tạo giáo viên:** Authentication → Users → Add user; tạo email giáo viên và xác minh. Sau đó chạy `supabase/sql-editor/set_teacher_role.sql` trong SQL Editor để cấp `profiles.role = 'teacher'`. Không cấp vai trò giáo viên qua metadata do người dùng tự sửa. Không chạy lại baseline lên database đã tồn tại khi chưa đối chiếu schema. Hướng dẫn migration: [Deploy database migrations](https://supabase.com/docs/guides/deployment/database-migrations).
7. **Cấu hình miền email alias:** đặt `STUDENT_AUTH_EMAIL_DOMAIN` thành miền do bạn quản lý và có DNS MX/A hợp lệ. Auth dùng `student-<username>@<miền>` nội bộ để ánh xạ username; học sinh chỉ cần nhập username. Không dùng `example.com`, `.test`, `.invalid` hay một miền không phân giải được.
8. **Tạo file env local:** trong PowerShell chạy `Copy-Item .env.example .env.local`, mở `.env.local` bằng editor và điền URL, publishable key, Gemini key, server secret và miền email. `.env.local` được Git ignore; không dán các giá trị thật vào issue/chat hoặc commit.
9. **Tự kiểm tra cấu hình mà không lộ khóa:** chạy `.\scripts\check-supabase-config.ps1`. Script chỉ in trạng thái, loại khóa và kết quả GET chỉ đọc; không in URL hoặc giá trị khóa. Claim iss trên legacy JWT không đủ để xác định project. Nếu phép GET chỉ đọc báo khóa bị từ chối, hãy sao chép Project URL cùng publishable/anon key từ cùng project trong Supabase Dashboard; nếu trả HTTP khác 200, kiểm tra RLS, grants và migrations.
10. **Kiểm tra kết nối:** chạy `npm run build`, mở `/api/public-curriculum` và xác nhận HTTP 200. Nếu gặp `Invalid API key`, kiểm tra Project URL và publishable key cùng project, sau đó redeploy. Mở `/giao-vien`; sau khi có teacher session thật, thử tạo học sinh, giữ credential tạm an toàn, đăng nhập học sinh và đổi mật khẩu. Tài khoản test phải được tạo trong project của bạn; không dùng tài khoản giả hoặc mật khẩu đưa lên GitHub.


Ví dụ triển khai migration sau khi liên kết đúng project:

```powershell
npx supabase login
npx supabase link --project-ref <PROJECT_REF>
npx supabase migration list --remote
npx supabase db push --remote
```

Chỉ đẩy migration sau khi kiểm tra project ID và trạng thái migration remote. Supabase lưu lịch sử migration riêng với Git; không dùng `migration repair` để né lỗi schema khi chưa biết chính xác trạng thái database.
## Oracle VPS (phương án thay thế Render)

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
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=...
SUPABASE_SECRET_KEY=...
GEMINI_API_KEY=...
STUDENT_AUTH_EMAIL_DOMAIN=vatly.com
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

> **Ghi chú về `npm audit`:** 3 advisory hiện có (`vitest`, `tinypool`, `@vitest/mocker`) đều nằm trong nhóm **devDependencies** (bộ công cụ test, không chạy trên production). `vitest` có 2 critical là do bản 3.2.7; nâng lên vitest 4.x (breaking) sẽ hết — không cấp bách vì không ảnh hưởng code học sinh/giáo viên.

Sau khi migration và biến môi trường được áp dụng, thử với một tài khoản giáo viên thật và hai học sinh trên cửa sổ thường/ẩn danh: đăng nhập, đổi mật khẩu lần đầu, mở lại browser, logout, tạo hồ sơ, nhập lô có một dòng lỗi, đăng nhập từng học sinh, xác nhận API từ tài khoản khác bị chặn. Các tài khoản kiểm thử phải được tạo/xác minh trong chính Supabase của chủ dự án; mã nguồn không chứa mật khẩu mẫu. Kiểm tra key chỉ bằng trạng thái HTTP, không in hoặc sao chép secret ra log.
