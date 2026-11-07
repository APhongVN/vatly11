import { NextResponse } from "next/server";
import { authorizeApi } from "@/lib/api-security";
import { readBoundedRequestText } from "@/lib/read-bounded-request.mjs";
import {
  isValidQuestionTopic,
  isValidQuestionContent,
  normalizeQuestionContent,
} from "@/lib/student-questions.mjs";

const MAX_REQUEST_BYTES = 8_000;

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export async function GET() {
  const access = await authorizeApi(["student", "teacher"], 40, "student-question");
  if ("response" in access) return access.response;

  try {
    if (access.profile.role === "teacher") {
      const { data, error } = await access.supabase
        .from("student_questions")
        .select("id,student_id,students(full_name,class_name),topic,content,status,teacher_response,responded_at,created_at,updated_at")
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      return NextResponse.json({ questions: data || [] });
    }

    const { data: student, error: studentError } = await access.supabase
      .from("students")
      .select("id")
      .eq("auth_user_id", access.user.id)
      .maybeSingle();
    if (studentError) return NextResponse.json({ error: "Không kiểm tra được hồ sơ học sinh." }, { status: 503 });
    if (!student) return NextResponse.json({ error: "Tài khoản chưa được gắn với hồ sơ học sinh." }, { status: 403 });

    const { data, error } = await access.supabase
      .from("student_questions")
      .select("id,topic,content,status,teacher_response,responded_at,created_at,updated_at")
      .eq("student_id", student.id)
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw error;
    return NextResponse.json({ questions: data || [] });
  } catch {
    return NextResponse.json({ error: "Không tải được danh sách câu hỏi." }, { status: 503 });
  }
}

export async function POST(request: Request) {
  const access = await authorizeApi(["student"], 20, "student-question");
  if ("response" in access) return access.response;

  try {
    const declaredLength = Number(request.headers.get("content-length") || 0);
    if (Number.isFinite(declaredLength) && declaredLength > MAX_REQUEST_BYTES) {
      return NextResponse.json({ error: "Câu hỏi vượt quá dung lượng cho phép." }, { status: 413 });
    }
    const body: unknown = JSON.parse(await readBoundedRequestText(request, MAX_REQUEST_BYTES));
    if (!isRecord(body)) {
      return NextResponse.json({ error: "Nội dung câu hỏi không hợp lệ." }, { status: 400 });
    }
    const topic = body.topic;
    const content = normalizeQuestionContent(body.content);
    if (!isValidQuestionTopic(topic)) {
      return NextResponse.json({ error: "Hãy chọn một chủ đề trong danh mục." }, { status: 400 });
    }
    if (!isValidQuestionContent(content)) {
      return NextResponse.json({ error: "Câu hỏi cần dài từ 5 đến 1500 ký tự." }, { status: 400 });
    }

    const { data: student, error: studentError } = await access.supabase
      .from("students")
      .select("id")
      .eq("auth_user_id", access.user.id)
      .maybeSingle();
    if (studentError) return NextResponse.json({ error: "Không kiểm tra được hồ sơ học sinh." }, { status: 503 });
    if (!student) return NextResponse.json({ error: "Tài khoản chưa được gắn với hồ sơ học sinh." }, { status: 403 });

    const { data: question, error } = await access.supabase
      .from("student_questions")
      .insert({ student_id: student.id, topic, content, status: "unanswered" })
      .select("id,topic,content,status,created_at")
      .single();
    if (error || !question) {
      console.error("Không thể lưu câu hỏi", { code: error?.code });
      return NextResponse.json({ error: "Không thể gửi câu hỏi lúc này." }, { status: 500 });
    }
    return NextResponse.json({ question }, { status: 201 });
  } catch (error) {
    const tooLarge = error instanceof Error && error.name === "RequestBodyTooLargeError";
    return NextResponse.json(
      { error: tooLarge ? "Câu hỏi vượt quá dung lượng cho phép." : "Nội dung câu hỏi không hợp lệ." },
      { status: tooLarge ? 413 : 400 },
    );
  }
}