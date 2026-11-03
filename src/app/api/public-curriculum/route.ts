import { NextResponse } from "next/server";
import { createSupabasePublicClient } from "@/lib/supabase-public";

export const dynamic = "force-dynamic";

const cacheHeaders = {
  "Cache-Control": "public, max-age=30, stale-while-revalidate=60",
};

async function readAllRows<T>(
  loadPage: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>,
  label: string,
) {
  const pageSize = 500;
  const maxRows = 10_000;
  const rows: T[] = [];
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await loadPage(from, from + pageSize - 1);
    if (error) throw new Error(`${label}: ${error.message}`);
    const page = data || [];
    rows.push(...page);
    if (rows.length > maxRows) throw new Error(`${label} vượt quá giới hạn danh mục công khai.`);
    if (page.length < pageSize) return rows;
  }
}

export async function GET() {
  try {
    const supabase = createSupabasePublicClient();
    const [courses, chapters, activities] = await Promise.all([
      readAllRows((from, to) => supabase.from("courses").select("id,title,description,grade_level,subject").order("id").range(from, to).abortSignal(AbortSignal.timeout(4000)), "Môn học"),
      readAllRows((from, to) => supabase.from("chapters").select("id,title,description,course_id").order("id").range(from, to).abortSignal(AbortSignal.timeout(4000)), "Chương học"),
      readAllRows((from, to) => supabase.from("activities").select("id,title,description,phase,type,duration,status,deliverable,course_id,chapter_id,accepting_submissions,deadline").in("status", ["available", "locked", "done"]).order("id").range(from, to).abortSignal(AbortSignal.timeout(4000)), "Hoạt động"),
    ]);

    return NextResponse.json({ courses, chapters, activities }, { headers: cacheHeaders });
  } catch (error) {
    console.error("Không tải được danh mục học tập công khai:", error instanceof Error ? error.message : "unknown error");
    return NextResponse.json(
      { error: "Danh mục lớp học hiện chưa tải được từ cơ sở dữ liệu." },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
