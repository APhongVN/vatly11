import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { createSupabaseAdminClient } from "@/lib/supabase-admin";

type Role = "teacher" | "student";
type RateLimitBucket =
  | "activity-evidence"
  | "capacitance-lab-settings"
  | "file-download"
  | "peer-votes"
  | "chat"
  | "grade"
  | "ocr"
  | "quiz"
  | "analytics"
  | "readiness-analysis"
  | "student-account"
  | "account-password"

export async function authorizeApi(allowedRoles: Role[], rateLimit: number, bucket: RateLimitBucket) {
  const supabase = await createServerSupabaseClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) {
    return { response: NextResponse.json({ error: "Vui lòng đăng nhập để tiếp tục." }, { status: 401 }) };
  }

  const { data: profile } = await supabase.from("profiles").select("role,must_change_password").eq("id", user.id).maybeSingle();
  if (!profile || !allowedRoles.includes(profile.role as Role)) {
    return { response: NextResponse.json({ error: "Tài khoản không có quyền thực hiện thao tác này." }, { status: 403 }) };
  }
  if (profile.role === "student" && profile.must_change_password && bucket !== "account-password") {
    return { response: NextResponse.json({ error: "Hãy đổi mật khẩu tạm trước khi tiếp tục." }, { status: 403 }) };
  }

  let rateLimiter: ReturnType<typeof createSupabaseAdminClient>;
  try {
    rateLimiter = createSupabaseAdminClient();
  } catch {
    return { response: NextResponse.json({ error: "Dịch vụ tạm thời chưa sẵn sàng." }, { status: 503 }) };
  }
  const { data: allowed, error: limitError } = await rateLimiter.rpc("consume_api_rate_limit", {
    p_user_id: user.id,
    p_bucket: bucket,
    p_limit: rateLimit,
    p_window_seconds: 60,
  });
  if (limitError) {
    console.error("API rate limiter is unavailable", { code: limitError.code });
    return { response: NextResponse.json({ error: "Dịch vụ tạm thời chưa sẵn sàng." }, { status: 503 }) };
  }
  if (!allowed) {
    return { response: NextResponse.json({ error: "Bạn thao tác quá nhanh. Vui lòng thử lại sau một phút." }, { status: 429 }) };
  }
  return { user, profile, supabase };
}
