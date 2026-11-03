import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getSupabasePublicKey } from "@/lib/supabase-config";

const SESSION_COOKIE_OPTIONS = {
  maxAge: 400 * 24 * 60 * 60,
  path: "/",
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
};

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
  const isStudentPreview = request.nextUrl.pathname.replace(/\/+$/, "") === "/hoc-sinh";
  let response = NextResponse.next({ request });
  if (isStudentPreview) return response;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = getSupabasePublicKey();
  if (!url || !key) {
    // Cổng giáo viên và trang xem học sinh là công khai; các thao tác ghi vẫn qua API có xác thực.
    return isTeacherPortal ? response : redirectWithRefreshedCookies(response, request, "/login");
  }

  const supabase = createServerClient(url, key, {
    cookieOptions: SESSION_COOKIE_OPTIONS,
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

  // Làm mới refresh token ở mọi cổng, nhưng không chặn khách xem dashboard giáo viên.
  let claims: { sub?: string } | null = null;
  try {
    const { data } = await supabase.auth.getClaims();
    claims = data?.claims || null;
  } catch {
    // Cổng giáo viên vẫn là trang xem mẫu công khai nếu Supabase đang lỗi.
    if (isTeacherPortal) return response;
  }
  if (isTeacherPortal) return response;
  if (!claims?.sub) return redirectWithRefreshedCookies(response, request, "/login");

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("role,must_change_password")
    .eq("id", claims.sub)
    .maybeSingle();

  if (error || !profile || profile.role !== "student") {
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
