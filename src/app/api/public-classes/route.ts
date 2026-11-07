import { NextResponse } from "next/server";
import { createSupabaseAdminClient, hasSupabaseAdminKey } from "@/lib/supabase-admin";

/**
 * Mục 11: trả danh sách tên lớp (không kèm dữ liệu học sinh) để trang đăng nhập
 * cho học sinh chọn lớp trước khi đăng nhập. Chỉ trả tên lớp đang có học sinh active.
 */
export async function GET() {
  if (!hasSupabaseAdminKey()) {
    return NextResponse.json({ classes: [] }, { headers: { "Cache-Control": "no-store, max-age=0" } });
  }
  try {
    const admin = createSupabaseAdminClient();
    const { data, error } = await admin
      .from("students")
      .select("class_name")
      .eq("is_active", true)
      .limit(2000);
    if (error) {
      // is_active có thể chưa có (migration cũ); thử lại không lọc.
      const fallback = await admin.from("students").select("class_name").limit(2000);
      if (fallback.error) throw fallback.error;
      return NextResponse.json({ classes: uniqueClasses(fallback.data) });
    }
    return NextResponse.json({ classes: uniqueClasses(data) });
  } catch {
    return NextResponse.json({ classes: [] }, { headers: { "Cache-Control": "no-store, max-age=0" } });
  }
}

function uniqueClasses(rows: Array<{ class_name?: string | null }> | null): string[] {
  const set = new Set<string>();
  for (const row of rows || []) {
    const name = String(row.class_name ?? "").normalize("NFC").trim();
    if (name) set.add(name);
  }
  return [...set].sort((left, right) => left.localeCompare(right, "vi", { sensitivity: "base", numeric: true }));
}