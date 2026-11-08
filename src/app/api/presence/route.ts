import { NextResponse } from "next/server";
import { authorizeApi } from "@/lib/api-security";

/**
 * Mục 7: học sinh gọi route này định kỳ để cập nhật "lần cuối hoạt động".
 * Giáo viên dùng dữ liệu students.last_seen_at để biết em đang online/offline.
 */
export async function POST() {
  const access = await authorizeApi(["student"], 60, "activity-evidence");
  if ("response" in access) return access.response;
  try {
    const { error } = await access.supabase
      .from("students")
      .update({ last_seen_at: new Date().toISOString() })
      .eq("auth_user_id", access.user.id);
    if (error) {
      if (error.code === "42703" || error.code === "PGRST204") {
        return NextResponse.json({ ok: true, presenceSupported: false });
      }
      return NextResponse.json({ error: "Không cập nhật được trạng thái." }, { status: 503 });
    }
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Không cập nhật được trạng thái." }, { status: 503 });
  }
}