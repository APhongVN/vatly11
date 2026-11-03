import { NextResponse } from "next/server";
import { authorizeApi } from "@/lib/api-security";
import { readBoundedRequestText } from "@/lib/read-bounded-request.mjs";
import { createSupabaseAdminClient, hasSupabaseAdminKey } from "@/lib/supabase-admin";
import { provisionStudentAccount } from "@/lib/student-accounts";

export async function POST(request: Request) {
  const access = await authorizeApi(["teacher"], 10, "student-account");
  if ("response" in access) return access.response;
  if (!hasSupabaseAdminKey()) return NextResponse.json({ error: "Máy chủ chưa cấu hình quyền cấp tài khoản." }, { status: 503 });

  try {
    const raw = await readBoundedRequestText(request, 40_000);
    let body: { class_name?: unknown; students?: unknown };
    try { body = JSON.parse(raw) as typeof body; } catch { return NextResponse.json({ error: "Dữ liệu JSON không hợp lệ." }, { status: 400 }); }
    const className = typeof body.class_name === "string" ? body.class_name.normalize("NFC").trim() : "";
    if (className.length < 1 || className.length > 40 || !Array.isArray(body.students) || body.students.length < 1 || body.students.length > 100) {
      return NextResponse.json({ error: "Mỗi lượt cần có lớp hợp lệ và từ 1 đến 100 học sinh." }, { status: 400 });
    }
    const rows = body.students.map((item) => {
      if (!item || typeof item !== "object") return null;
      const value = item as { full_name?: unknown; birth_date?: unknown };
      const fullName = typeof value.full_name === "string" ? value.full_name.normalize("NFC").trim() : "";
      const birthDate = value.birth_date === undefined || value.birth_date === null || value.birth_date === "" ? null : value.birth_date;
      if (fullName.length < 3 || fullName.length > 120) return null;
      if (birthDate !== null && (typeof birthDate !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(birthDate) || Number.isNaN(Date.parse(`${birthDate}T00:00:00Z`)))) return null;
      return { fullName, birthDate };
    });
    if (rows.some((row) => row === null)) return NextResponse.json({ error: "Có học sinh thiếu họ tên hợp lệ hoặc ngày sinh sai định dạng." }, { status: 400 });

    const admin = createSupabaseAdminClient();
    const results: Array<{ index: number; ok: boolean; student?: unknown; credentials?: unknown; error?: string }> = [];
    // Giới hạn song song để lô lớn không làm quá tải Auth.
    for (let offset = 0; offset < rows.length; offset += 4) {
      const group = rows.slice(offset, offset + 4) as Array<{ fullName: string; birthDate: string | null }>;
      const settled = await Promise.allSettled(group.map((row) => provisionStudentAccount(admin, { fullName: row.fullName, className, birthDate: row.birthDate })));
      settled.forEach((result, localIndex) => {
        const index = offset + localIndex;
        if (result.status === "fulfilled") {
          const student = result.value;
          results.push({ index, ok: true, student: { id: student.id, full_name: student.full_name, class_name: student.class_name, auth_user_id: student.auth_user_id, username: student.username }, credentials: { username: student.username, password: student.password } });
        } else {
          results.push({ index, ok: false, error: result.reason instanceof Error ? result.reason.message : "Không tạo được tài khoản." });
        }
      });
    }
    const created = results.filter((result) => result.ok).length;
    return NextResponse.json({ results, created, failed: results.length - created }, {
      headers: { "Cache-Control": "no-store, max-age=0", Pragma: "no-cache" },
    });
  } catch (error) {
    const tooLarge = error instanceof Error && error.name === "RequestBodyTooLargeError";
    return NextResponse.json({ error: tooLarge ? "Yêu cầu vượt quá dung lượng." : "Không thể nhập danh sách lúc này." }, { status: tooLarge ? 413 : 503 });
  }
}
