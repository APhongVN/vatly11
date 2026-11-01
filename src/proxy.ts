import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });
  const isTeacherPortal = request.nextUrl.pathname.startsWith("/giao-vien");

  // Guests may inspect the teacher interface in its isolated sample mode.
  // Protected student routes and authenticated teacher data remain role-gated.
  if (isTeacherPortal && (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)) {
    return response;
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) { return request.cookies.get(name)?.value; },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({ name, value, ...options });
          response = NextResponse.next({ request });
          response.cookies.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({ name, value: "", ...options });
          response = NextResponse.next({ request });
          response.cookies.set({ name, value: "", ...options });
        },
      },
    },
  );

  const { data: { user } } = await supabase.auth.getUser();
  const expectedRole = isTeacherPortal ? "teacher" : "student";
  if (!user) return isTeacherPortal ? response : NextResponse.redirect(new URL("/login", request.url));
  const { data: profile } = await supabase.from("profiles").select("role,must_change_password").eq("id", user.id).maybeSingle();
  if (!profile || profile.role !== expectedRole) {
    return NextResponse.redirect(new URL("/login?error=role", request.url));
  }
  if (profile.role === "student" && profile.must_change_password && request.nextUrl.pathname !== "/doi-mat-khau") {
    return NextResponse.redirect(new URL("/doi-mat-khau", request.url));
  }
  return response;
}

export const config = {
  matcher: ["/giao-vien/:path*", "/hoc-sinh/:path*", "/nop-bai/:path*", "/phieu-nhom/:path*", "/lam-bai/:path*", "/doi-mat-khau/:path*"],
};
