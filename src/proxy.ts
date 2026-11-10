import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getSupabasePublicKey } from "@/lib/supabase-config";

// Cookie session: đánh dấu Secure chỉ khi trang thực sự dùng HTTPS.
// Render chạy sau proxy nên phải đọc x-forwarded-proto; localhost/http:// thì
// không đánh dấu Secure, nếu không trình duyệt TỪ CHỐI lưu cookie -> session mất
// -> máy mới không vào được cổng (máy cũ vẫn vào vì đã có cookie sẵn).
function buildSessionCookieOptions(request: NextRequest): CookieOptions {
  const proto = request.headers.get("x-forwarded-proto") || request.nextUrl.protocol.replace(":", "");
  const isHttps = proto === "https" || request.headers.get("x-forwarded-ssl") === "on";
  return {
    maxAge: 400 * 24 * 60 * 60,
    path: "/",
    sameSite: "lax" as const,
    secure: isHttps,
  };
}

function redirectWithRefreshedCookies(response: NextResponse, request: NextRequest, destination: string) {
  const redirect = NextResponse.redirect(new URL(destination, request.url));
  for (const cookie of response.cookies.getAll()) redirect.cookies.set(cookie);
  for (const header of ["cache-control", "expires", "pragma"]) {
    const value = response.headers.get(header);
    if (value) redirect.headers.set(header, value);
  }
  return redirect;
}

export async function proxy(request: NextRequest) {
  const isTeacherPortal = request.nextUrl.pathname === "/giao-vien"
    || request.nextUrl.pathname.startsWith("/giao-vien/");
  let response = NextResponse.next({ request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = getSupabasePublicKey();
  if (!url || !key) {
    // Không cấu hình Supabase: yêu cầu đăng nhập thay vì hiển thị dữ liệu mẫu.
    return redirectWithRefreshedCookies(response, request, "/login");
  }

  const supabase = createServerClient(url, key, {
    cookieOptions: buildSessionCookieOptions(request),
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
        for (const { name, value } of cookiesToSet) request.cookies.set(name, value);
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
      },
    },
  });

  // Làm mới refresh token ở mọi cổng. Cổng giáo viên và cổng học sinh đều yêu cầu
  // đăng nhập; khách chưa đăng nhập được chuyển thẳng sang trang đăng nhập.
  let claims: { sub?: string } | null = null;
  try {
    const { data } = await supabase.auth.getClaims();
    claims = data?.claims || null;
  } catch {
    // getClaims() có thể lỗi ở lần đầu sau khi đăng nhập (token mới chưa phổ biến).
    // Thử đọc session trực tiếp; nếu vẫn không có thì mới yêu cầu đăng nhập lại.
    try {
      const { data } = await supabase.auth.getUser();
      if (data?.user) claims = { sub: data.user.id };
    } catch {
      return redirectWithRefreshedCookies(response, request, "/login");
    }
  }
  if (!claims?.sub) return redirectWithRefreshedCookies(response, request, "/login");

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("role,must_change_password")
    .eq("id", claims.sub)
    .maybeSingle();

  if (error || !profile) {
    return redirectWithRefreshedCookies(response, request, "/login?error=role");
  }

  if (isTeacherPortal) {
    if (profile.role !== "teacher") {
      return redirectWithRefreshedCookies(response, request, "/login?error=role");
    }
    if (profile.must_change_password && request.nextUrl.pathname !== "/doi-mat-khau") {
      return redirectWithRefreshedCookies(response, request, "/doi-mat-khau");
    }
    return response;
  }

  if (profile.role !== "student") {
    return redirectWithRefreshedCookies(response, request, "/login?error=role");
  }
  if (profile.must_change_password && request.nextUrl.pathname !== "/doi-mat-khau") {
    return redirectWithRefreshedCookies(response, request, "/doi-mat-khau");
  }
  return response;
}

export const config = {
  matcher: ["/giao-vien/:path*", "/hoc-sinh/:path*", "/nop-bai/:path*", "/phieu-nhom/:path*", "/lam-bai/:path*", "/doi-mat-khau/:path*"],
};
