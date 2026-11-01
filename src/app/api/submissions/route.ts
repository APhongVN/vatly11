import { NextResponse } from "next/server";
import { authorizeApi } from "@/lib/api-security";
import { normalizeSubmissionFileUrl } from "@/lib/submission-validation";
import { readBoundedRequestText } from "@/lib/read-bounded-request.mjs";

const MAX_ANSWER_LENGTH = 12_000;
const MAX_REQUEST_BYTES = 96_000;

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
    const declaredLength = Number(request.headers.get("content-length") || 0);
    if (Number.isFinite(declaredLength) && declaredLength > MAX_REQUEST_BYTES) {
      return NextResponse.json({ error: "Bài nộp vượt quá dung lượng cho phép." }, { status: 413 });
    }
    const body: unknown = JSON.parse(await readBoundedRequestText(request, MAX_REQUEST_BYTES));
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json({ error: "Dữ liệu bài nộp không hợp lệ." }, { status: 400 });
    }
    const payload = body as Record<string, unknown>;
    const activityId = Number(payload.activityId);
    const answer = typeof payload.answer === "string" ? payload.answer.replace(/\0/g, "").trim() : "";
    const fileUrl = normalizeSubmissionFileUrl(payload.fileUrl, access.user.id);

    if (!Number.isInteger(activityId) || activityId < 1) {
      return NextResponse.json({ error: "Hoạt động không hợp lệ." }, { status: 400 });
    }
    if (answer.length > MAX_ANSWER_LENGTH) {
      return NextResponse.json({ error: "Nội dung bài làm tối đa 12.000 ký tự." }, { status: 413 });
    }
    if (!answer && !fileUrl) {
      return NextResponse.json({ error: "Cần có nội dung bài làm, tệp hoặc liên kết hợp lệ." }, { status: 400 });
    }
    if (payload.fileUrl && !fileUrl) {
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
  } catch (error) {
    const tooLarge = error instanceof Error && error.name === "RequestBodyTooLargeError";
    return NextResponse.json(
      { error: tooLarge ? "Bài nộp vượt quá dung lượng cho phép." : "Dữ liệu bài nộp không hợp lệ." },
      { status: tooLarge ? 413 : 400 },
    );
  }
}
