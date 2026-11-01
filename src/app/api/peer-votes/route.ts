import { NextResponse } from "next/server";
import { authorizeApi } from "@/lib/api-security";
import { createSupabaseAdminClient, hasSupabaseAdminKey } from "@/lib/supabase-admin";
import { getPeerDiscussionWindow, isPeerChoiceSet, summarizePeerVotes } from "@/lib/peer-votes.mjs";

const QUESTION_IDS = ["PI1", "PI2", "PI3"] as const;
type QuestionId = typeof QUESTION_IDS[number];
type Choices = Record<QuestionId, number>;
function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
async function readVotes(admin: ReturnType<typeof createSupabaseAdminClient>) {
  const { data, error } = await admin.from("peer_instruction_votes")
    .select("question_id,first_choice,second_choice");
  if (error) throw error;
  return (data || []) as Array<{ question_id: string; first_choice: number | null; second_choice: number | null }>;
}

export async function GET() {
  const access = await authorizeApi(["student", "teacher"], 30, "peer-votes");
  if ("response" in access) return access.response;
  if (!hasSupabaseAdminKey()) {
    return NextResponse.json({ error: "Dịch vụ bình chọn chưa được cấu hình." }, { status: 503 });
  }
  try {
    const admin = createSupabaseAdminClient();
    const rows = await readVotes(admin);
    let myFirstAnswers: Partial<Choices> = {};
    let mySecondAnswers: Partial<Choices> = {};
    if (access.profile.role === "student") {
      const { data: student, error: studentError } = await access.supabase.from("students")
        .select("id").eq("auth_user_id", access.user.id).maybeSingle();
      if (studentError) return NextResponse.json({ error: "Không tải được hồ sơ học sinh." }, { status: 503 });
      if (!student) return NextResponse.json({ error: "Tài khoản chưa được gắn với hồ sơ học sinh." }, { status: 403 });
      const { data: ownVotes, error: ownError } = await admin.from("peer_instruction_votes")
        .select("question_id,first_choice,second_choice,first_voted_at,updated_at").eq("student_id", student.id);
      if (ownError) throw ownError;
      for (const vote of ownVotes || []) {
        if (!QUESTION_IDS.includes(vote.question_id as QuestionId)) continue;
        if (typeof vote.first_choice === "number") myFirstAnswers[vote.question_id as QuestionId] = vote.first_choice;
        if (typeof vote.second_choice === "number") mySecondAnswers[vote.question_id as QuestionId] = vote.second_choice;
      }
    }
    return NextResponse.json({ ...summarizePeerVotes(rows), myFirstAnswers, mySecondAnswers });
  } catch {
    return NextResponse.json({ error: "Không tải được kết quả bình chọn." }, { status: 503 });
  }
}

export async function POST(request: Request) {
  const access = await authorizeApi(["student"], 20, "peer-votes");
  if ("response" in access) return access.response;
  if (!hasSupabaseAdminKey()) {
    return NextResponse.json({ error: "Dịch vụ bình chọn chưa được cấu hình." }, { status: 503 });
  }
  try {
    const length = Number(request.headers.get("content-length") || 0);
    if (length > 8_000) return NextResponse.json({ error: "Dữ liệu bình chọn quá lớn." }, { status: 413 });
    const rawBody = await request.text();
    if (new TextEncoder().encode(rawBody).byteLength > 8_000) return NextResponse.json({ error: "Dữ liệu bình chọn quá lớn." }, { status: 413 });
    const body = JSON.parse(rawBody) as { phase?: unknown; answers?: unknown };
    if ((body.phase !== "first" && body.phase !== "second") || !isPeerChoiceSet(body.answers)) {
      return NextResponse.json({ error: "Lựa chọn bình chọn chưa hợp lệ." }, { status: 400 });
    }
    const { data: student, error: studentError } = await access.supabase.from("students")
      .select("id").eq("auth_user_id", access.user.id).maybeSingle();
    if (studentError) return NextResponse.json({ error: "Không kiểm tra được hồ sơ học sinh." }, { status: 503 });
    if (!student) return NextResponse.json({ error: "Tài khoản chưa được gắn với hồ sơ học sinh." }, { status: 403 });
    const { data: activity, error: activityError } = await access.supabase.from("activities")
      .select("status,accepting_submissions,deadline").eq("id", 7).maybeSingle();
    if (activityError || !activity) return NextResponse.json({ error: "Không tìm thấy hoạt động bình chọn." }, { status: 404 });
    if (activity.status !== "available" || !activity.accepting_submissions || (activity.deadline && (!Number.isFinite(Date.parse(activity.deadline)) || Date.parse(activity.deadline) < Date.now()))) {
      return NextResponse.json({ error: "Hoạt động hiện không nhận bình chọn." }, { status: 403 });
    }
    const admin = createSupabaseAdminClient();
    const { data: completed, error: completionError } = await admin.from("activity_evidence")
      .select("completed_at").eq("student_id", student.id).eq("activity_id", 7).maybeSingle();
    if (completionError) return NextResponse.json({ error: "Không kiểm tra được trạng thái bài nộp." }, { status: 503 });
    if (completed?.completed_at) return NextResponse.json({ error: "Bài đã nộp, bình chọn đã được khóa." }, { status: 409 });
    const answers = body.answers as Choices;
    const { data: ownRows, error: ownError } = await admin.from("peer_instruction_votes")
      .select("question_id,first_choice,second_choice,first_voted_at,updated_at").eq("student_id", student.id);
    if (ownError) throw ownError;
    const own = new Map((ownRows || []).map((row) => [row.question_id, row]));
    let rows;
    if (body.phase === "first") {
      const priorChoices = QUESTION_IDS.map((id) => own.get(id)?.first_choice);
      if (priorChoices.some((choice) => typeof choice === "number")) {
        const sameVote = QUESTION_IDS.every((id) => own.get(id)?.first_choice === answers[id]);
        if (!sameVote) return NextResponse.json({ error: "Bình chọn lần đầu đã được ghi nhận và không thể sửa." }, { status: 409 });
      } else {
        const firstVotedAt = new Date().toISOString();
        rows = QUESTION_IDS.map((id) => ({ student_id: student.id, question_id: id, first_choice: answers[id], first_voted_at: firstVotedAt, updated_at: firstVotedAt }));
        const { error: saveError } = await admin.from("peer_instruction_votes").upsert(rows, { onConflict: "student_id,question_id", ignoreDuplicates: true });
        if (saveError) throw saveError;
      }
    } else {
      if (!QUESTION_IDS.every((id) => typeof own.get(id)?.first_choice === "number")) {
        return NextResponse.json({ error: "Hãy hoàn thành bình chọn lần đầu trước." }, { status: 409 });
      }
      const firstVoteTime = QUESTION_IDS.map((id) => own.get(id)?.first_voted_at).filter((value): value is string => typeof value === "string").sort()[0];
      const discussionWindow = getPeerDiscussionWindow(firstVoteTime);
      if (!discussionWindow.available) {
        return NextResponse.json({ error: "Hãy trao đổi đủ hai phút trước khi bình chọn lại.", secondsRemaining: discussionWindow.secondsRemaining }, { status: 403 });
      }
      rows = QUESTION_IDS.map((id) => ({
        student_id: student.id,
        question_id: id,
        first_choice: own.get(id)!.first_choice,
        first_voted_at: own.get(id)!.first_voted_at,
        second_choice: answers[id],
        updated_at: new Date().toISOString(),
      }));
      const { error: saveError } = await admin.from("peer_instruction_votes").upsert(rows, { onConflict: "student_id,question_id" });
      if (saveError) throw saveError;
    }
    return NextResponse.json(summarizePeerVotes(await readVotes(admin)));
  } catch {
    return NextResponse.json({ error: "Không lưu được bình chọn lúc này." }, { status: 503 });
  }
}
