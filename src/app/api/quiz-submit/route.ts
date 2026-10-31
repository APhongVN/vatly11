import { NextResponse } from "next/server";
import { authorizeApi } from "@/lib/api-security";
import { createSupabaseAdminClient } from "@/lib/supabase-admin";

export async function POST(request: Request) {
  const access = await authorizeApi(["student"], 5, "quiz");
  if ("response" in access) return access.response;
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return NextResponse.json({ error: "Dịch vụ chấm chưa được cấu hình đầy đủ trên máy chủ." }, { status: 503 });

  try {
    const rawBody = await request.text();
    if (new TextEncoder().encode(rawBody).byteLength > 16_000) {
      return NextResponse.json({ error: "Bài làm vượt quá dung lượng cho phép." }, { status: 413 });
    }
    const body = JSON.parse(rawBody) as { quizId?: unknown; answers?: unknown };
    const quizId = Number(body.quizId);
    if (!Number.isInteger(quizId) || !body.answers || typeof body.answers !== "object" || Array.isArray(body.answers)) {
      return NextResponse.json({ error: "Thông tin bài làm không hợp lệ." }, { status: 400 });
    }

    const { data: quiz } = await access.supabase.from("quizzes").select("id,activity_id").eq("id", quizId).maybeSingle();
    if (!quiz) return NextResponse.json({ error: "Không tìm thấy bài trắc nghiệm." }, { status: 404 });
    if (quiz.activity_id) {
      const { data: activity } = await access.supabase.from("activities")
        .select("status,accepting_submissions,deadline").eq("id", quiz.activity_id).maybeSingle();
      if (!activity || activity.status !== "available" || !activity.accepting_submissions || (activity.deadline && new Date(activity.deadline).getTime() < Date.now())) {
        return NextResponse.json({ error: "Hoạt động hiện không nhận bài trắc nghiệm." }, { status: 403 });
      }
    }

    const { data: student } = await access.supabase.from("students")
      .select("id").eq("auth_user_id", access.user.id).maybeSingle();
    if (!student) return NextResponse.json({ error: "Tài khoản chưa được gắn với hồ sơ học sinh." }, { status: 403 });

    const { data: existing } = await access.supabase.from("quiz_submissions")
      .select("id").eq("quiz_id", quizId).eq("student_id", student.id).maybeSingle();
    if (existing) return NextResponse.json({ error: "Bài trắc nghiệm này đã được nộp." }, { status: 409 });

    const { data: questions, error: questionsError } = await access.supabase.from("quiz_questions")
      .select("id,options").eq("quiz_id", quizId).order("id");
    if (questionsError || !questions?.length) return NextResponse.json({ error: "Bài trắc nghiệm chưa có câu hỏi." }, { status: 422 });

    const providedAnswers = body.answers as Record<string, unknown>;
    for (const [questionId, selected] of Object.entries(providedAnswers)) {
      if (!questions.some((question) => String(question.id) === questionId) || !Number.isInteger(selected) || Number(selected) < 0 || Number(selected) > 3) {
        return NextResponse.json({ error: "Câu trả lời chứa lựa chọn không hợp lệ." }, { status: 400 });
      }
    }

    const admin = createSupabaseAdminClient();
    const questionIds = questions.map((question) => question.id);
    const { data: keys, error: keysError } = await admin.from("quiz_question_keys")
      .select("question_id,correct_option,explanation").in("question_id", questionIds);
    if (keysError || !keys || keys.length !== questions.length) {
      return NextResponse.json({ error: "Đáp án của bài trắc nghiệm chưa được cấu hình đầy đủ." }, { status: 503 });
    }

    const answerByQuestion = new Map(keys.map((key) => [String(key.question_id), key]));
    let correctCount = 0;
    for (const question of questions) {
      const key = answerByQuestion.get(String(question.id));
      if (!key) continue;
      if (Number(providedAnswers[String(question.id)]) === key.correct_option) correctCount += 1;
    }

    const score = Math.round((correctCount / questions.length) * 1000) / 100;
    const { error: saveError } = await admin.from("quiz_submissions").insert({
      quiz_id: quizId,
      student_id: student.id,
      score,
    });
    if (saveError) {
      if (saveError.code === "23505") {
        return NextResponse.json({ error: "Bài trắc nghiệm này đã được nộp." }, { status: 409 });
      }
      console.error("Could not save quiz result", { code: saveError.code });
      return NextResponse.json({ error: "Không lưu được kết quả bài làm." }, { status: 503 });
    }

    return NextResponse.json({ score });
  } catch (error) {
    console.error("Quiz submission failed", error instanceof Error ? error.message : "unknown error");
    return NextResponse.json({ error: "Không thể chấm bài trắc nghiệm lúc này." }, { status: 500 });
  }
}
