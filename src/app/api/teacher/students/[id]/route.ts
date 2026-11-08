import { NextResponse } from "next/server";
import { authorizeApi } from "@/lib/api-security";
import { createSupabaseAdminClient, hasSupabaseAdminKey } from "@/lib/supabase-admin";

type RouteContext = { params: Promise<{ id: string }> };
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const noStore = { "Cache-Control": "no-store, max-age=0", Pragma: "no-cache" };

async function resolveId(context: RouteContext) {
  const { id } = await context.params;
  return UUID_PATTERN.test(id) ? id : null;
}

function isMissingArchiveMigration(error: { code?: string } | null) {
  return error?.code === "42703" || error?.code === "PGRST204";
}

export async function DELETE(request: Request, context: RouteContext) {
  const access = await authorizeApi(["teacher"], 10, "student-account");
  if ("response" in access) return access.response;
  if (!hasSupabaseAdminKey()) return NextResponse.json({ error: "Máy chủ chưa cấu hình quyền quản lý học sinh." }, { status: 503, headers: noStore });

  const id = await resolveId(context);
  if (!id) return NextResponse.json({ error: "Mã học sinh chưa hợp lệ." }, { status: 400, headers: noStore });
  // ?hard=true: xóa hẳn hồ sơ (bỏ qua lưu trữ mềm). Mất lịch sử bài nộp kèm theo.
  const hardDelete = new URL(request.url).searchParams.get("hard") === "true";

  try {
    const admin = createSupabaseAdminClient();
    const { data: student, error: lookupError } = await admin.from("students")
      .select("id,auth_user_id,is_active").eq("id", id).maybeSingle();
    if (lookupError) {
      return NextResponse.json({
        error: isMissingArchiveMigration(lookupError)
          ? "Cần áp dụng migration 20261103000200_student_archive.sql trước khi lưu trữ học sinh."
          : "Không đọc được hồ sơ học sinh.",
      }, { status: isMissingArchiveMigration(lookupError) ? 409 : 503, headers: noStore });
    }
    if (!student) return NextResponse.json({ error: "Không tìm thấy hồ sơ học sinh." }, { status: 404, headers: noStore });
    if (student.is_active === false && !hardDelete) return NextResponse.json({ student: { id, is_active: false } }, { headers: noStore });

    // Revoke the login identity first. The student row and all linked work stay in the database.
    if (student.auth_user_id) {
      const { error: deleteAuthError } = await admin.auth.admin.deleteUser(student.auth_user_id);
      const userAlreadyRemoved = deleteAuthError?.status === 404 || deleteAuthError?.code === "user_not_found";
      if (deleteAuthError && !userAlreadyRemoved) {
        console.error("Student account revocation failed", { code: deleteAuthError.code || "unknown" });
        return NextResponse.json({ error: "Không khóa được tài khoản đăng nhập; hồ sơ chưa được lưu trữ." }, { status: 503, headers: noStore });
      }
    }

    // Xóa hẳn: xóa cả hồ sơ + mọi dữ liệu liên kết (submissions, quiz, nhóm, chat...).
    if (hardDelete) {
      const { error: hardError } = await admin.from("students").delete().eq("id", id);
      if (hardError) { console.error("Hard delete failed", { code: hardError.code }); return NextResponse.json({ error: "Không xóa hẳn được học sinh." }, { status: 503, headers: noStore }); }
      return NextResponse.json({ student: { id, deleted: true } }, { headers: noStore });
    }

    const { data: archived, error: archiveError } = await admin.from("students")
      .update({ is_active: false }).eq("id", id).select("id,is_active").maybeSingle();
    if (archiveError || !archived) {
      console.error("Student archive failed", { code: archiveError?.code || "row_not_updated" });
      return NextResponse.json({
        error: "Tài khoản đã bị thu hồi nhưng chưa lưu được trạng thái hồ sơ. Tải lại rồi thử lưu trữ lại; lịch sử bài làm vẫn còn.",
      }, { status: 503, headers: noStore });
    }
    return NextResponse.json({ student: archived }, { headers: noStore });
  } catch (error) {
    console.error("Student archive request failed", { message: error instanceof Error ? error.message : "unknown" });
    return NextResponse.json({ error: "Không lưu trữ được học sinh lúc này." }, { status: 503, headers: noStore });
  }
}

export async function PATCH(_request: Request, context: RouteContext) {
  const access = await authorizeApi(["teacher"], 10, "student-account");
  if ("response" in access) return access.response;
  if (!hasSupabaseAdminKey()) return NextResponse.json({ error: "Máy chủ chưa cấu hình quyền quản lý học sinh." }, { status: 503, headers: noStore });

  const id = await resolveId(context);
  if (!id) return NextResponse.json({ error: "Mã học sinh chưa hợp lệ." }, { status: 400, headers: noStore });

  try {
    const admin = createSupabaseAdminClient();
    const { data: restored, error } = await admin.from("students")
      .update({ is_active: true }).eq("id", id).select("id,is_active").maybeSingle();
    if (error) {
      const missingMigration = isMissingArchiveMigration(error);
      return NextResponse.json({
        error: missingMigration ? "Cần áp dụng migration 20261103000200_student_archive.sql trước khi khôi phục học sinh." : "Không khôi phục được hồ sơ học sinh.",
      }, { status: missingMigration ? 409 : 503, headers: noStore });
    }
    if (!restored) return NextResponse.json({ error: "Không tìm thấy hồ sơ học sinh." }, { status: 404, headers: noStore });
    return NextResponse.json({ student: restored }, { headers: noStore });
  } catch (error) {
    console.error("Student restore request failed", { message: error instanceof Error ? error.message : "unknown" });
    return NextResponse.json({ error: "Không khôi phục được học sinh lúc này." }, { status: 503, headers: noStore });
  }
}
