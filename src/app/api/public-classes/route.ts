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
      .select("id,full_name,class_name,student_code")
      .eq("is_active", true)
      .limit(2000)
      .order("full_name");
    if (error) {
      // is_active có thể chưa có (migration cũ); thử lại không lọc.
      const fallback = await admin.from("students").select("id,full_name,class_name,student_code").limit(2000).order("full_name");
      if (fallback.error) throw fallback.error;
      return NextResponse.json({ classes: groupStudentsByClass(fallback.data) }, { headers: { "Cache-Control": "no-store, max-age=0" } });
    }
    return NextResponse.json({ classes: groupStudentsByClass(data) }, { headers: { "Cache-Control": "no-store, max-age=0" } });
  } catch {
    return NextResponse.json({ classes: [] }, { headers: { "Cache-Control": "no-store, max-age=0" } });
  }
}

type StudentRow = { id: string; full_name?: string | null; class_name?: string | null; student_code?: string | null };
type ClassGroup = { name: string; students: Array<{ id: string; name: string; code?: string }> };

function groupStudentsByClass(rows: StudentRow[] | null): ClassGroup[] {
  const map = new Map<string, ClassGroup>();
  for (const row of rows || []) {
    const className = String(row.class_name ?? "").normalize("NFC").trim();
    if (!className) continue;
    let group = map.get(className);
    if (!group) { group = { name: className, students: [] }; map.set(className, group); }
    group.students.push({ id: row.id, name: String(row.full_name ?? "").trim(), code: row.student_code ? String(row.student_code) : undefined });
  }
  const groups = [...map.values()];
  for (const group of groups) {
    group.students.sort((a, b) => a.name.localeCompare(b.name, "vi", { sensitivity: "base" }));
  }
  return groups.sort((a, b) => a.name.localeCompare(b.name, "vi", { sensitivity: "base", numeric: true }));
}