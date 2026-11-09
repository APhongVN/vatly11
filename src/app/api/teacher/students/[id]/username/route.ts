import { NextResponse } from "next/server";
import { authorizeApi } from "@/lib/api-security";
import { createSupabaseAdminClient, hasSupabaseAdminKey } from "@/lib/supabase-admin";
import { normalizeStudentUsername, studentUsernameBase, studentInternalEmail } from "@/lib/student-accounts";

type RouteContext = { params: Promise<{ id: string }> };
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const noStore = { "Cache-Control": "no-store, max-age=0", Pragma: "no-cache" };

/**
 * Đổi tên đăng nhập (username) của học sinh theo họ tên mới.
 * Chỉ giáo viên; cập nhật cả students.username và email alias nội bộ.
 */
export async function PATCH(request: Request, context: RouteContext) {
  const access = await authorizeApi(["teacher"], 10, "student-account");
  if ("response" in access) return access.response;
  if (!hasSupabaseAdminKey()) {
    return NextResponse.json({ error: "Máy chủ chưa cấu hình quyền quản lý học sinh." }, { status: 503, headers: noStore });
  }

  const { id } = await context.params;
  if (!UUID_PATTERN.test(id)) {
    return NextResponse.json({ error: "Mã học sinh chưa hợp lệ." }, { status: 400, headers: noStore });
  }

  try {
    const rawBody = await request.text();
    const body = JSON.parse(rawBody || "{}") as { full_name?: unknown };
    const fullName = typeof body.full_name === "string" ? body.full_name.normalize("NFC").trim() : "";
    if (fullName.length < 3) {
      return NextResponse.json({ error: "Họ tên mới chưa hợp lệ." }, { status: 400, headers: noStore });
    }

    const admin = createSupabaseAdminClient();
    const { data: student, error: lookupError } = await admin.from("students")
      .select("id,full_name,auth_user_id,username").eq("id", id).maybeSingle();
    if (lookupError) return NextResponse.json({ error: "Không đọc được hồ sơ học sinh." }, { status: 503, headers: noStore });
    if (!student) return NextResponse.json({ error: "Không tìm thấy hồ sơ học sinh." }, { status: 404, headers: noStore });

    // Tên đăng nhập mới phái theo họ tên mới, trùng thì thêm số.
    const base = studentUsernameBase(fullName);
    let candidate = base;
    for (let attempt = 2; attempt <= 50; attempt += 1) {
      const { data: existing } = await admin.from("students")
        .select("id").eq("username", candidate).neq("id", id).maybeSingle();
      if (!existing) break;
      candidate = `${base}${attempt}`.slice(0, 32);
    }

    const { data: updated, error: updateError } = await admin.from("students")
      .update({ username: candidate, login_email: studentInternalEmail(candidate) })
      .eq("id", id).select("id,username,login_email").maybeSingle();
    if (updateError) return NextResponse.json({ error: "Không cập nhật được tên đăng nhập." }, { status: 503, headers: noStore });
    if (!updated) return NextResponse.json({ error: "Không tìm thấy hồ sơ học sinh." }, { status: 404, headers: noStore });

    // Đồng bộ email alias nội bộ trong Supabase Auth (nếu tài khoản đã tồn tại).
    if (student.auth_user_id) {
      const { error: authError } = await admin.auth.admin.updateUserById(student.auth_user_id, {
        email: studentInternalEmail(candidate),
      });
      if (authError) {
        console.warn("Không đồng bộ được email alias:", authError.message);
      }
    }

    return NextResponse.json({ student: updated }, { headers: noStore });
  } catch (error) {
    console.error("Student username change failed", { message: error instanceof Error ? error.message : "unknown" });
    return NextResponse.json({ error: "Không đổi được tên đăng nhập lúc này." }, { status: 503, headers: noStore });
  }
}
