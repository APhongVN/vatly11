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
    const raw = await readBoundedRequestText(request, 8_000);
    let body: { full_name?: unknown; class_name?: unknown; birth_date?: unknown };
    try { body = JSON.parse(raw) as typeof body; } catch { return NextResponse.json({ error: "Dữ liệu JSON không hợp lệ." }, { status: 400 }); }
    const fullName = typeof body.full_name === "string" ? body.full_name.normalize("NFC").trim() : "";
    const className = typeof body.class_name === "string" ? body.class_name.normalize("NFC").trim() : "";
    const birthDate = body.birth_date === undefined || body.birth_date === null || body.birth_date === "" ? null : body.birth_date;
    if (fullName.length < 3 || fullName.length > 120 || className.length < 1 || className.length > 40) {
      return NextResponse.json({ error: "Họ tên hoặc tên lớp chưa hợp lệ." }, { status: 400 });
    }
    if (birthDate !== null && (typeof birthDate !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(birthDate) || Number.isNaN(Date.parse(`${birthDate}T00:00:00Z`)))) {
      return NextResponse.json({ error: "Ngày sinh cần có dạng YYYY-MM-DD." }, { status: 400 });
    }
    const admin = createSupabaseAdminClient();
    const student = await provisionStudentAccount(admin, { fullName, className, birthDate });
    const { password, ...publicStudent } = student;
    return NextResponse.json({ student: publicStudent, credentials: { username: student.username, password } }, {
      headers: { "Cache-Control": "no-store, max-age=0", Pragma: "no-cache" },
    });
  } catch (error) {
    const tooLarge = error instanceof Error && error.name === "RequestBodyTooLargeError";
    console.error("Student account creation failed", { message: error instanceof Error ? error.message : "unknown" });
    return NextResponse.json({ error: tooLarge ? "Yêu cầu vượt quá dung lượng." : error instanceof Error ? error.message : "Không thể tạo tài khoản học sinh." }, { status: tooLarge ? 413 : 503 });
  }
}
