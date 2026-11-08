import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { createSupabaseAdminClient } from "@/lib/supabase-admin";
import { normalizeStudentUsername, studentUsernameRateLimitHash, clientAddressRateLimitHash, studentInternalEmail } from "@/lib/student-accounts";
import { readBoundedRequestText } from "@/lib/read-bounded-request.mjs";

const noStore = { "Cache-Control": "no-store, max-age=0", Pragma: "no-cache" };

export async function POST(request: Request) {
  try {
    const raw = await readBoundedRequestText(request, 4_000);
    let body: { username?: unknown; password?: unknown; className?: unknown };
    try { body = JSON.parse(raw) as typeof body; } catch { return NextResponse.json({ error: "Tên đăng nhập hoặc mật khẩu không đúng." }, { status: 401, headers: noStore }); }
    const username = typeof body.username === "string" ? normalizeStudentUsername(body.username) : "";
    const password = typeof body.password === "string" ? body.password : "";
    const className = typeof body.className === "string" ? body.className.normalize("NFC").trim() : "";
    if (username.length < 3 || username.length > 32 || password.length < 8 || password.length > 128) {
      return NextResponse.json({ error: "Tên đăng nhập hoặc mật khẩu không đúng." }, { status: 401, headers: noStore });
    }
    if (!className || className.length > 40) {
      return NextResponse.json({ error: "Hãy chọn lớp trước khi đăng nhập." }, { status: 400, headers: noStore });
    }

    const forwarded = request.headers.get("cf-connecting-ip") || request.headers.get("x-real-ip") || null;
    const admin = createSupabaseAdminClient();
    const addressLimit = await admin.rpc("consume_student_auth_rate_limit", {
      p_subject_hash: clientAddressRateLimitHash(forwarded || "ip-unavailable"), p_limit: 30, p_window_seconds: 600,
    });
    if (addressLimit.error || addressLimit.data !== true) {
      return NextResponse.json({ error: addressLimit.error ? "Dịch vụ đăng nhập tạm thời chưa sẵn sàng." : "Đã thử quá nhiều lần. Hãy thử lại sau 10 phút." }, { status: addressLimit.error ? 503 : 429, headers: noStore });
    }
    const { data: student, error: lookupError } = await admin.from("students")
      .select("id,full_name,class_name,auth_user_id,username,login_email")
      .eq("username", username).maybeSingle();
    let studentRow = student;
    // Mục 11: nếu username chưa khớp do khác hoa/thường, so sánh không phân biệt case.
    if (!studentRow) {
      const { data: alt } = await admin.from("students").select("id,full_name,class_name,auth_user_id,username,login_email").limit(2000);
      const matched = (alt || []).find((row: any) => String(row.username ?? "").toLowerCase() === username.toLowerCase());
      studentRow = matched ?? null;
    }
    if (studentRow) {
      const usernameLimit = await admin.rpc("consume_student_auth_rate_limit", {
        p_subject_hash: studentUsernameRateLimitHash(username), p_limit: 8, p_window_seconds: 600,
      });
      if (usernameLimit.error || usernameLimit.data !== true) {
        return NextResponse.json({ error: usernameLimit.error ? "Dịch vụ đăng nhập tạm thời chưa sẵn sàng." : "Bạn đã thử quá nhiều lần. Hãy đợi 10 phút rồi thử lại." }, { status: usernameLimit.error ? 503 : 429, headers: noStore });
      }
    }
    const email = studentRow?.login_email || studentInternalEmail(username);
    const supabase = await createServerSupabaseClient();
    const { data: signedIn, error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    if (lookupError || !studentRow || signInError || !signedIn.user) {
      if (!signInError) await supabase.auth.signOut();
      return NextResponse.json({ error: "Tên đăng nhập hoặc mật khẩu không đúng." }, { status: 401, headers: noStore });
    }
    // Nếu học sinh đăng nhập đúng (mật khẩu khớp) nhưng auth_user_id trong DB còn là bản cũ
    // (do giáo viên cấp lại tài khoản), đồng bộ lại liên kết để tránh báo "sai" một cách oan (mục 5).
    // Chỉ cập nhật students.auth_user_id + bảo đảm có profile cho user hiện tại; không ghi đè
    // khóa chính của các bảng khác để tránh phá vỡ ràng buộc toàn vẹn.
    if (studentRow.auth_user_id !== signedIn.user.id) {
      await admin.from("students").update({ auth_user_id: signedIn.user.id }).eq("id", studentRow.id);
      studentRow.auth_user_id = signedIn.user.id;
      const { error: profileEnsure } = await admin.from("profiles").upsert(
        { id: signedIn.user.id, role: "student", full_name: studentRow.full_name, must_change_password: true },
        { onConflict: "id" },
      );
      if (profileEnsure) {
        await supabase.auth.signOut();
        return NextResponse.json({ error: "Tài khoản học sinh chưa được cấu hình đúng. Hãy liên hệ giáo viên." }, { status: 403, headers: noStore });
      }
    }
    // Mục 11: học sinh phải đăng nhập đúng lớp của mình.
    const studentClass = String(studentRow.class_name ?? "").normalize("NFC").trim();
    if (studentClass.length === 0 || studentClass.toLocaleLowerCase("vi") !== className.toLocaleLowerCase("vi")) {
      await supabase.auth.signOut();
      return NextResponse.json({ error: studentClass ? `Tài khoản này không thuộc lớp ${className}. Hãy chọn đúng lớp rồi thử lại.` : "Tài khoản này chưa được xếp lớp. Xin liên hệ giáo viên." }, { status: 403, headers: noStore });
    }
    const { data: profile, error: profileError } = await admin.from("profiles")
      .select("role,must_change_password").eq("id", signedIn.user.id).maybeSingle();
    if (profileError || !profile || profile.role !== "student") {
      await supabase.auth.signOut();
      return NextResponse.json({ error: "Tài khoản học sinh chưa được cấu hình đúng." }, { status: 403, headers: noStore });
    }
    return NextResponse.json({
      mustChangePassword: profile.must_change_password === true,
      student: { id: studentRow.id, full_name: studentRow.full_name, class_name: studentRow.class_name, auth_user_id: signedIn.user.id, username: studentRow.username },
    }, { headers: noStore });
  } catch (error) {
    const tooLarge = error instanceof Error && error.name === "RequestBodyTooLargeError";
    return NextResponse.json({ error: tooLarge ? "Yêu cầu vượt quá dung lượng." : "Không thể đăng nhập lúc này." }, { status: tooLarge ? 413 : 503, headers: noStore });
  }
}
