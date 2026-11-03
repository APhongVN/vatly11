import { NextResponse } from "next/server";
import { authorizeApi } from "@/lib/api-security";
import { readBoundedRequestText } from "@/lib/read-bounded-request.mjs";
import { createSupabaseAdminClient, hasSupabaseAdminKey } from "@/lib/supabase-admin";
import { provisionStudentAccount } from "@/lib/student-accounts";

export async function POST(request: Request) {
  const access = await authorizeApi(["teacher"], 10, "student-account");
  if ("response" in access) return access.response;
  if (!hasSupabaseAdminKey()) return NextResponse.json({ error: "Chưa cấu hình quyền quản lý tài khoản trên máy chủ." }, { status: 503 });

  try {
    const rawBody = await readBoundedRequestText(request, 4_000);
    let body: { studentId?: unknown };
    try { body = JSON.parse(rawBody) as typeof body; } catch { return NextResponse.json({ error: "Dữ liệu JSON không hợp lệ." }, { status: 400 }); }
    if (typeof body.studentId !== "string" || !/^[0-9a-f-]{36}$/i.test(body.studentId)) {
      return NextResponse.json({ error: "Mã học sinh chưa hợp lệ." }, { status: 400 });
    }
    const admin = createSupabaseAdminClient();
    const student = await provisionStudentAccount(admin, { fullName: "", className: "", studentId: body.studentId });
    const { password, ...publicStudent } = student;
    return NextResponse.json({ student: publicStudent, credentials: { username: student.username, password } }, {
      headers: { "Cache-Control": "no-store, max-age=0", Pragma: "no-cache" },
    });
  } catch (error) {
    const tooLarge = error instanceof Error && error.name === "RequestBodyTooLargeError";
    return NextResponse.json({ error: tooLarge ? "Yêu cầu vượt quá dung lượng." : error instanceof Error ? error.message : "Không thể cấp tài khoản lúc này." }, { status: tooLarge ? 413 : 503 });
  }
}
