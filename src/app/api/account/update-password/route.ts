import { NextResponse } from "next/server";
import { authorizeApi } from "@/lib/api-security";
import { readBoundedRequestText } from "@/lib/read-bounded-request.mjs";
import { createSupabaseAdminClient } from "@/lib/supabase-admin";

export async function POST(request: Request) {
  const access = await authorizeApi(["student"], 4, "account-password");
  if ("response" in access) return access.response;
  if (access.profile.must_change_password !== true) {
    return NextResponse.json({ error: "Tài khoản không yêu cầu đổi mật khẩu tạm." }, { status: 409 });
  }

  try {
    const rawBody = await readBoundedRequestText(request, 4_000);
    const body = JSON.parse(rawBody) as { password?: unknown };
    if (typeof body.password !== "string" || body.password.length < 12 || body.password.length > 128) {
      return NextResponse.json({ error: "Mật khẩu mới cần dài từ 12 đến 128 ký tự." }, { status: 400 });
    }
    const { error: passwordError } = await access.supabase.auth.updateUser({ password: body.password });
    if (passwordError) return NextResponse.json({ error: "Không đổi được mật khẩu. Hãy kiểm tra lại rồi thử lại." }, { status: 400 });

    const admin = createSupabaseAdminClient();
    const { data: profile, error: profileError } = await admin.from("profiles")
      .update({ must_change_password: false }).eq("id", access.user.id).select("id").maybeSingle();
    if (profileError || !profile) {
      return NextResponse.json({ error: "Mật khẩu đã đổi nhưng chưa cập nhật được trạng thái tài khoản. Hãy thử gửi lại." }, { status: 503 });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    const tooLarge = error instanceof Error && error.name === "RequestBodyTooLargeError";
    return NextResponse.json({ error: tooLarge ? "Mật khẩu vượt quá dung lượng." : "Không thể đổi mật khẩu lúc này." }, { status: tooLarge ? 413 : 503 });
  }
}
