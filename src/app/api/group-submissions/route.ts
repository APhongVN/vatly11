import { NextResponse } from "next/server";
import { authorizeApi } from "@/lib/api-security";
import { normalizeSubmissionFileUrl } from "@/lib/submission-validation";

const MAX_ANSWER_LENGTH = 12_000;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** Server-owned creation/update of one group's submission. */
export async function POST(request: Request) {
  const access = await authorizeApi(["student"], 12, "group-submission");
  if ("response" in access) return access.response;

  try {
    const body = await request.json();
    const assignmentId = typeof body?.assignmentId === "string" ? body.assignmentId : "";
    const groupId = typeof body?.groupId === "string" ? body.groupId : "";
    const answer = typeof body?.answer === "string" ? body.answer.replace(/\0/g, "").trim() : "";
    const fileUrl = normalizeSubmissionFileUrl(body?.fileUrl, access.user.id, "group-submissions");
    if (!UUID.test(assignmentId) || !UUID.test(groupId)) {
      return NextResponse.json({ error: "Bài tập hoặc nhóm không hợp lệ." }, { status: 400 });
    }
    if (answer.length > MAX_ANSWER_LENGTH) {
      return NextResponse.json({ error: "Nội dung bài làm tối đa 12.000 ký tự." }, { status: 413 });
    }
    if (!answer && !fileUrl) {
      return NextResponse.json({ error: "Cần có nội dung bài làm hoặc tệp hợp lệ." }, { status: 400 });
    }
    if (body?.fileUrl && !fileUrl) {
      return NextResponse.json({ error: "Đường dẫn tệp không hợp lệ." }, { status: 400 });
    }

    const { data: student, error: studentError } = await access.supabase
      .from("students").select("id").eq("auth_user_id", access.user.id).maybeSingle();
    if (studentError || !student) {
      return NextResponse.json({ error: "Tài khoản chưa liên kết với danh sách lớp." }, { status: 403 });
    }
    const { data: membership, error: membershipError } = await access.supabase
      .from("group_assignment_members")
      .select("group_id,group_assignment_groups!inner(assignment_id,group_number,group_name)")
      .eq("group_id", groupId).eq("student_id", student.id).maybeSingle();
    const relatedGroup = membership?.group_assignment_groups;
    const group = Array.isArray(relatedGroup) ? relatedGroup[0] : relatedGroup;
    if (membershipError || !membership || !group || group.assignment_id !== assignmentId) {
      return NextResponse.json({ error: "Em không thuộc nhóm của bài tập này." }, { status: 403 });
    }
    const { data: assignment, error: assignmentError } = await access.supabase
      .from("group_assignments").select("id,deadline").eq("id", assignmentId).maybeSingle();
    if (assignmentError || !assignment) {
      return NextResponse.json({ error: "Không tìm thấy bài tập nhóm." }, { status: 404 });
    }
    if (assignment.deadline && new Date(assignment.deadline).getTime() < Date.now()) {
      return NextResponse.json({ error: "Bài tập nhóm đã quá hạn nộp." }, { status: 403 });
    }

    const { data: submission, error } = await access.supabase.from("group_submissions").upsert({
      assignment_id: assignmentId,
      group_id: groupId,
      group_name: group.group_name || `Nhóm ${group.group_number}`,
      answer,
      file_url: fileUrl,
      status: "pending",
    }, { onConflict: "group_id" }).select("id,status,submitted_at").single();
    if (error || !submission) {
      console.error("Không thể lưu bài nộp nhóm", { code: error?.code });
      return NextResponse.json({ error: "Không thể lưu bài nộp nhóm lúc này." }, { status: 500 });
    }
    return NextResponse.json({ submission }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Dữ liệu bài nộp nhóm không hợp lệ." }, { status: 400 });
  }
}
