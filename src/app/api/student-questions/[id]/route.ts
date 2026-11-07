import { NextResponse } from "next/server";
import { authorizeApi } from "@/lib/api-security";
import { readBoundedRequestText } from "@/lib/read-bounded-request.mjs";
import {
  isValidQuestionStatus,
  isValidTeacherResponse,
  canTransitionQuestionStatus,
  normalizeQuestionContent,
} from "@/lib/student-questions.mjs";

const MAX_REQUEST_BYTES = 4_000;

type RouteContext = { params: Promise<{ id: string }> };

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export async function PATCH(request: Request, context: RouteContext) {
  const access = await authorizeApi(["teacher"], 20, "student-question");
  if ("response" in access) return access.response;

  const { id: questionId } = await context.params;
  if (!questionId) return NextResponse.json({ error: "ID câu hỏi không hợp lệ." }, { status: 400 });

  try {
    const declaredLength = Number(request.headers.get("content-length") || 0);
    if (Number.isFinite(declaredLength) && declaredLength > MAX_REQUEST_BYTES) {
      return NextResponse.json({ error: "Dữ liệu cập nhật quá lớn." }, { status: 413 });
    }
    const body: unknown = JSON.parse(await readBoundedRequestText(request, MAX_REQUEST_BYTES));
    if (!isRecord(body)) {
      return NextResponse.json({ error: "Dữ liệu không hợp lệ." }, { status: 400 });
    }
    const { status, teacher_response } = body as Record<string, unknown>;
    if (status !== undefined && !isValidQuestionStatus(status)) {
      return NextResponse.json({ error: "Trạng thái không hợp lệ." }, { status: 400 });
    }
    if (teacher_response !== undefined && !isValidTeacherResponse(teacher_response)) {
      return NextResponse.json({ error: "Nội dung trả lời quá dài hoặc không hợp lệ." }, { status: 400 });
    }

    const { data: existing, error: loadError } = await access.supabase
      .from("student_questions")
      .select("status,teacher_response")
      .eq("id", questionId)
      .maybeSingle();
    if (loadError) return NextResponse.json({ error: "Không tìm thấy câu hỏi." }, { status: 404 });
    if (!existing) return NextResponse.json({ error: "Câu hỏi không tồn tại." }, { status: 404 });

    const newStatus = status as string | undefined;
    const newResponse = teacher_response as string | undefined;
    const hasResponse = !!(newResponse ?? existing.teacher_response);
    if (newStatus && !canTransitionQuestionStatus(existing.status, newStatus, hasResponse)) {
      return NextResponse.json({ error: "Không thể chuyển trạng thái mà chưa có trả lời." }, { status: 400 });
    }

    const updatePayload: Record<string, any> = {};
    if (newStatus) updatePayload.status = newStatus;
    if (newResponse) {
      updatePayload.teacher_response = normalizeQuestionContent(newResponse);
      updatePayload.responder_id = access.user.id;
      updatePayload.responded_at = new Date().toISOString();
    }
    if (Object.keys(updatePayload).length === 0) {
      return NextResponse.json({ error: "Không có thay đổi nào được gửi." }, { status: 400 });
    }

    const { data: updated, error: updateError } = await access.supabase
      .from("student_questions")
      .update(updatePayload)
      .eq("id", questionId)
      .select("id,status,teacher_response,responded_at,updated_at")
      .single();
    if (updateError) {
      console.error("Không cập nhật được câu hỏi", { code: updateError.code });
      return NextResponse.json({ error: "Cập nhật thất bại." }, { status: 500 });
    }
    return NextResponse.json({ question: updated }, { status: 200 });
  } catch (error) {
    const tooLarge = error instanceof Error && error.name === "RequestBodyTooLargeError";
    return NextResponse.json(
      { error: tooLarge ? "Dữ liệu quá lớn." : "Dữ liệu không hợp lệ." },
      { status: tooLarge ? 413 : 400 },
    );
  }
}
