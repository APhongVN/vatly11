import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getSupabasePublicKey } from "@/lib/supabase-config";

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });
  const isTeacherPortal = request.nextUrl.pathname.startsWith("/giao-vien");

  // The teacher dashboard is open for direct preview; its page enables live data only for a teacher session.
  if (isTeacherPortal) return response;

  const supabasePublicKey = getSupabasePublicKey();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    supabasePublicKey,
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
  const expectedRole = "student";
  if (!user) return NextResponse.redirect(new URL("/login", request.url));
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
