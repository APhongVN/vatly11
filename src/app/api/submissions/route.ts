import { NextResponse } from "next/server";
import { authorizeApi } from "@/lib/api-security";
import { normalizeSubmissionFileUrl } from "@/lib/submission-validation";

const MAX_ANSWER_LENGTH = 12_000;

/**
 * The browser may upload a file to the student-owned storage prefix, but the
 * submission record itself is always created through this checked server route.
 * AI output is deliberately not accepted here: it is a suggestion, never a
 * student-controlled grade.
 */
export async function POST(request: Request) {
  const access = await authorizeApi(["student"], 12, "submission");
  if ("response" in access) return access.response;

  try {
    const body = await request.json();
    const activityId = Number(body?.activityId);
    const answer = typeof body?.answer === "string" ? body.answer.replace(/\0/g, "").trim() : "";
    const fileUrl = normalizeSubmissionFileUrl(body?.fileUrl, access.user.id);

    if (!Number.isInteger(activityId) || activityId < 1) {
      return NextResponse.json({ error: "Hoạt động không hợp lệ." }, { status: 400 });
    }
    if (answer.length > MAX_ANSWER_LENGTH) {
      return NextResponse.json({ error: "Nội dung bài làm tối đa 12.000 ký tự." }, { status: 413 });
    }
    if (!answer && !fileUrl) {
      return NextResponse.json({ error: "Cần có nội dung bài làm, tệp hoặc liên kết hợp lệ." }, { status: 400 });
    }
    if (body?.fileUrl && !fileUrl) {
      return NextResponse.json({ error: "Liên kết hoặc đường dẫn tệp không hợp lệ." }, { status: 400 });
    }

    const [{ data: student, error: studentError }, { data: activity, error: activityError }] = await Promise.all([
      access.supabase.from("students").select("id,full_name").eq("auth_user_id", access.user.id).maybeSingle(),
      access.supabase.from("activities").select("id,status,accepting_submissions,deadline").eq("id", activityId).maybeSingle(),
    ]);
    if (studentError || !student) {
      return NextResponse.json({ error: "Tài khoản chưa liên kết với danh sách lớp." }, { status: 403 });
    }
    if (activityError || !activity) {
      return NextResponse.json({ error: "Không tìm thấy hoạt động." }, { status: 404 });
    }
    if (activity.status !== "available" || !activity.accepting_submissions || (activity.deadline && new Date(activity.deadline).getTime() < Date.now())) {
      return NextResponse.json({ error: "Hoạt động chưa mở nhận bài hoặc đã quá hạn." }, { status: 403 });
    }

    const { data: submission, error } = await access.supabase.from("submissions").insert({
      student_id: student.id,
      student_name: student.full_name,
      activity_id: activity.id,
      answer,
      file_url: fileUrl,
      status: "pending",
    }).select("id,status,submitted_at").single();
    if (error?.code === "23505") {
      return NextResponse.json({ error: "Em đã nộp bài cho hoạt động này. Hãy liên hệ giáo viên nếu cần nộp lại." }, { status: 409 });
    }
    if (error || !submission) {
      console.error("Không thể lưu bài nộp", { code: error?.code });
      return NextResponse.json({ error: "Không thể lưu bài nộp lúc này." }, { status: 500 });
    }
    return NextResponse.json({ submission }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Dữ liệu bài nộp không hợp lệ." }, { status: 400 });
  }
}
