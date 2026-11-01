import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { authorizeApi } from "@/lib/api-security";
import { createSupabaseAdminClient, hasSupabaseAdminKey } from "@/lib/supabase-admin";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export async function POST(request: Request) {
  const access = await authorizeApi(["teacher"], 5, "student-account");
  if ("response" in access) return access.response;
  if (!hasSupabaseAdminKey()) {
    return NextResponse.json({ error: "Chưa cấu hình quyền quản lý tài khoản trên máy chủ." }, { status: 503 });
  }

  let admin: ReturnType<typeof createSupabaseAdminClient> | null = null;
  let createdUserId: string | null = null;
  const rollbackCreatedUser = async () => {
    if (admin && createdUserId) {
      await admin.auth.admin.deleteUser(createdUserId);
      createdUserId = null;
    }
  };

  try {
    const declaredLength = Number(request.headers.get("content-length") || 0);
    if (declaredLength > 4000) return NextResponse.json({ error: "Yêu cầu vượt quá dung lượng." }, { status: 413 });
    const rawBody = await request.text();
    if (new TextEncoder().encode(rawBody).byteLength > 4000) return NextResponse.json({ error: "Yêu cầu vượt quá dung lượng." }, { status: 413 });
    let body: { studentId?: unknown; email?: unknown };
    try { body = JSON.parse(rawBody) as { studentId?: unknown; email?: unknown }; }
    catch { return NextResponse.json({ error: "Dữ liệu gửi lên không phải JSON hợp lệ." }, { status: 400 }); }
    if (typeof body.studentId !== "string" || !/^[0-9a-f-]{36}$/i.test(body.studentId)
      || typeof body.email !== "string" || body.email.length > 254 || !EMAIL_PATTERN.test(body.email.trim())) {
      return NextResponse.json({ error: "Mã học sinh hoặc email chưa hợp lệ." }, { status: 400 });
    }
    const email = body.email.trim().toLowerCase();
    const { data: student, error: studentError } = await access.supabase.from("students")
      .select("id,full_name,auth_user_id,login_email").eq("id", body.studentId).maybeSingle();
    if (studentError) return NextResponse.json({ error: "Không tải được hồ sơ học sinh." }, { status: 503 });
    if (!student) return NextResponse.json({ error: "Không tìm thấy học sinh trong lớp." }, { status: 404 });
    if (student.auth_user_id) return NextResponse.json({ error: "Học sinh đã được liên kết với tài khoản." }, { status: 409 });

    admin = createSupabaseAdminClient();
    const password = `${randomBytes(24).toString("base64url")}aA1!`;
    const { data: created, error: createError } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: student.full_name, must_change_password: true },
    });
    if (created.user) createdUserId = created.user.id;
    if (createError || !created.user) {
      await rollbackCreatedUser();
      const duplicate = /already|exists|registered/i.test(createError?.message || "");
      return NextResponse.json({ error: duplicate ? "Email đã được sử dụng. Hiện chưa hỗ trợ ghép tài khoản có sẵn; hãy dùng email khác." : "Không tạo được tài khoản học sinh." }, { status: duplicate ? 409 : 503 });
    }

    const { error: profileError } = await admin.from("profiles").upsert({
      id: created.user.id,
      role: "student",
      full_name: student.full_name,
      must_change_password: true,
    });
    if (profileError) {
      await rollbackCreatedUser();
      return NextResponse.json({ error: "Không lưu được hồ sơ quyền học sinh." }, { status: 503 });
    }

    const { data: linked, error: linkError } = await admin.from("students")
      .update({ auth_user_id: created.user.id, login_email: email })
      .eq("id", student.id).is("auth_user_id", null).select("id").maybeSingle();
    if (linkError || !linked) {
      await rollbackCreatedUser();
      return NextResponse.json({ error: linkError?.code === "23505" ? "Email này đã được gắn với một học sinh khác." : "Không liên kết được tài khoản; hãy tải lại danh sách và thử lại." }, { status: linkError?.code === "23505" ? 409 : 503 });
    }

    createdUserId = null;
    return NextResponse.json({ email, password, studentName: student.full_name }, {
      headers: { "Cache-Control": "no-store, max-age=0", Pragma: "no-cache" },
    });
  } catch {
    if (admin && createdUserId) {
      try { await rollbackCreatedUser(); } catch { /* Best-effort cleanup; never log credentials. */ }
    }
    return NextResponse.json({ error: "Không thể cấp tài khoản lúc này." }, { status: 503 });
  }
}
