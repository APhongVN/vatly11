import { NextResponse } from "next/server";
import { authorizeApi } from "@/lib/api-security";
import { readBoundedRequestText } from "@/lib/read-bounded-request.mjs";
import { createSupabaseAdminClient } from "@/lib/supabase-admin";

const noStore = { "Cache-Control": "no-store, max-age=0", Pragma: "no-cache" };
const CLASS_NAME_PATTERN = /^[\p{L}\p{N} ._/-]{2,60}$/u;

/** Sắp xếp lớp thông minh: 11A1 < 11A2 < 12A1 (theo khối rồi theo số). */
function smartClassCompare(a: string, b: string) {
  const parse = (name: string) => {
    const trimmed = name.trim();
    const match = trimmed.match(/^(\d{1,2})\s*([A-Za-z])?\s*(\d{0,3})$/i);
    if (match) {
      return {
        grade: Number(match[1]) || 0,
        group: (match[2] || "").toUpperCase(),
        number: Number(match[3]) || 0,
        raw: trimmed,
      };
    }
    return { grade: 0, group: "", number: 0, raw: trimmed };
  };
  const left = parse(a);
  const right = parse(b);
  if (left.grade !== right.grade) return left.grade - right.grade;
  if (left.group !== right.group) return left.group.localeCompare(right.group, "vi");
  if (left.number !== right.number) return left.number - right.number;
  return left.raw.localeCompare(right.raw, "vi");
}

// GET: danh mục lớp kèm sỉ số (số học sinh) và ngày thành lập.
export async function GET() {
  const access = await authorizeApi(["teacher"], 40, "analytics");
  if ("response" in access) return access.response;

  try {
    const { data: classRows, error: classError } = await access.supabase
      .from("classes")
      .select("id,name,grade_level,school_year,homeroom_teacher,created_at,updated_at")
      .order("name")
      .limit(500);
    if (classError) throw new Error("Không đọc được danh mục lớp.");

    const { data: studentRows, error: studentError } = await access.supabase
      .from("students")
      .select("class_name,is_active")
      .limit(5000);
    if (studentError) throw new Error("Không đếm được số học sinh.");

    const countByClass = new Map<string, { total: number; active: number }>();
    for (const student of studentRows || []) {
      const className = (student as { class_name?: string | null }).class_name;
      if (!className) continue;
      const entry = countByClass.get(className) || { total: 0, active: 0 };
      entry.total += 1;
      if ((student as { is_active?: boolean }).is_active !== false) entry.active += 1;
      countByClass.set(className, entry);
    }

    const classes = (classRows || [])
      .map((row) => {
        const count = countByClass.get(row.name) || { total: 0, active: 0 };
        return { ...row, totalStudents: count.total, activeStudents: count.active };
      })
      .sort((a, b) => smartClassCompare(a.name, b.name));

    return NextResponse.json({ classes }, { headers: noStore });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Không tải được danh mục lớp." },
      { status: 503, headers: noStore },
    );
  }
}

// POST: tạo lớp mới.
export async function POST(request: Request) {
  const access = await authorizeApi(["teacher"], 10, "student-account");
  if ("response" in access) return access.response;

  try {
    const rawBody = await readBoundedRequestText(request, 4_000);
    const body = JSON.parse(rawBody || "{}") as { name?: unknown; grade_level?: unknown; school_year?: unknown; homeroom_teacher?: unknown };
    const name = typeof body.name === "string" ? body.name.normalize("NFC").trim() : "";
    if (!CLASS_NAME_PATTERN.test(name)) {
      return NextResponse.json({ error: "Tên lớp cần từ 2 đến 60 ký tự (chữ, số, dấu cách)." }, { status: 400, headers: noStore });
    }

    const admin = createSupabaseAdminClient();
    const { data: created, error } = await admin.from("classes")
      .insert({
        name,
        grade_level: typeof body.grade_level === "string" ? body.grade_level.trim().slice(0, 20) : null,
        school_year: typeof body.school_year === "string" ? body.school_year.trim().slice(0, 20) : null,
        homeroom_teacher: typeof body.homeroom_teacher === "string" ? body.homeroom_teacher.trim().slice(0, 80) : null,
      })
      .select("id,name,grade_level,school_year,homeroom_teacher,created_at,updated_at")
      .maybeSingle();
    if (error) {
      if (error.code === "23505") return NextResponse.json({ error: "Lớp này đã tồn tại." }, { status: 409, headers: noStore });
      throw new Error("Không tạo được lớp.");
    }
    return NextResponse.json({ class: created }, { status: 201, headers: noStore });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Không tạo được lớp lúc này." },
      { status: 503, headers: noStore },
    );
  }
}

export async function DELETE(request: Request) {
  const access = await authorizeApi(["teacher"], 10, "student-account");
  if ("response" in access) return access.response;

  try {
    const name = new URL(request.url).searchParams.get("name") || "";
    if (!name) return NextResponse.json({ error: "Thiếu tên lớp cần xóa." }, { status: 400, headers: noStore });

    const admin = createSupabaseAdminClient();
    const { error } = await admin.from("classes").delete().eq("name", name);
    if (error) throw new Error("Không xóa được lớp.");
    return NextResponse.json({ success: true }, { headers: noStore });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Không xóa được lớp lúc này." },
      { status: 503, headers: noStore },
    );
  }
}
