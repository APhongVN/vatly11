import { NextResponse } from "next/server";
import { authorizeApi } from "@/lib/api-security";
import { readBoundedRequestText } from "@/lib/read-bounded-request.mjs";

/**
 * Đổi mật khẩu tài khoản giáo viên (đã đăng nhập).
 * Yêu cầu nhập mật khẩu hiện tại để tránh đổi khi bỏ máy.
 */
export async function POST(request: Request) {
  const access = await authorizeApi(["teacher"], 6, "account-password");
  if ("response" in access) return access.response;

  try {
    const rawBody = await readBoundedRequestText(request, 4_000);
    const body = JSON.parse(rawBody) as { currentPassword?: unknown; newPassword?: unknown };
    const currentPassword = typeof body.currentPassword === "string" ? body.currentPassword : "";
    const newPassword = typeof body.newPassword === "string" ? body.newPassword : "";

    if (!currentPassword) {
      return NextResponse.json({ error: "Hãy nhập mật khẩu hiện tại." }, { status: 400 });
    }
    if (newPassword.length < 6 || newPassword.length > 128) {
      return NextResponse.json({ error: "Mật khẩu mới cần dài từ 6 đến 128 ký tự." }, { status: 400 });
    }
    if (newPassword === currentPassword) {
      return NextResponse.json({ error: "Mật khẩu mới phải khác mật khẩu hiện tại." }, { status: 400 });
    }

    // Xác minh mật khẩu hiện tại bằng cách đăng nhập lại với email của giáo viên.
    const { data: userData } = await access.supabase.auth.getUser();
    const email = userData.user?.email;
    if (!email) {
      return NextResponse.json({ error: "Không xác định được email tài khoản." }, { status: 400 });
    }
    const { error: verifyError } = await access.supabase.auth.signInWithPassword({ email, password: currentPassword });
    if (verifyError) {
      return NextResponse.json({ error: "Mật khẩu hiện tại chưa đúng." }, { status: 401 });
    }

    const { error: passwordError } = await access.supabase.auth.updateUser({ password: newPassword });
    if (passwordError) {
      return NextResponse.json({ error: "Không đổi được mật khẩu. Hãy thử lại." }, { status: 400 });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    const tooLarge = error instanceof Error && error.name === "RequestBodyTooLargeError";
    return NextResponse.json(
      { error: tooLarge ? "Dữ liệu vượt quá dung lượng." : "Không thể đổi mật khẩu lúc này." },
      { status: tooLarge ? 413 : 503 },
    );
  }
}
