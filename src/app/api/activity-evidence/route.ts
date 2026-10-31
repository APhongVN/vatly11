import { NextResponse } from "next/server";
import { authorizeApi } from "@/lib/api-security";
import { createSupabaseAdminClient } from "@/lib/supabase-admin";
import { scoreActivityQuiz } from "@/lib/activity-quiz.mjs";

const MAX_BODY_BYTES = 64_000;
const QUIZ_ACTIVITY_IDS = new Set([6, 7, 12]);
const LAB_ACTIVITY_IDS = new Set([4, 8]);
const FORM_RESPONSE_FIELDS: Record<number, string[]> = {
  1: ["prediction", "explanation", "question"],
  3: ["hyp_q_u", "hyp_c_s", "hyp_c_d", "hyp_c_eps"],
  5: ["prediction", "evidence", "revision"],
  14: ["ref1", "ref2", "ref3", "ref4", "d1", "d2", "d3", "d4", "d5", "d6", "d7", "d8"],
};
const LAB_STATION_IDS = ["charge-discharge", "charge-voltage", "capacitance-factors", "source-state", "circuit-builder", "energy-graph"];

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isText(value: unknown, max = 2000): value is string {
  return typeof value === "string" && value.length <= max;
}

const EPSILON_0 = 8.854187817e-12;
function isValidWrittenEvidence(activityId: number, evidence: unknown, complete: boolean) {
  if (!isRecord(evidence) || evidence.kind !== "written-response" || !isRecord(evidence.responses)) return false;
  const allowed = FORM_RESPONSE_FIELDS[activityId];
  if (!allowed) return false;
  const responses = evidence.responses;
  if (Object.keys(responses).some((key) => !allowed.includes(key))) return false;
  return allowed.every((key) => {
    const answer = responses[key];
    if (answer === undefined && !complete) return true;
    return isText(answer, 4000) && (!complete || answer.trim().length >= 3);
  });
}

function finiteNumber(value: unknown, minimum: number, maximum: number): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= minimum && value <= maximum;
}
function closeEnough(actual: unknown, expected: number, relativeTolerance = 0.001) {
  return typeof actual === "number" && Number.isFinite(actual) && Math.abs(actual - expected) <= Math.max(Math.abs(expected) * relativeTolerance, 1e-18);
}

function isValidLabEvidence(evidence: unknown, complete: boolean) {
  if (!isRecord(evidence) || evidence.kind !== "virtual-lab" || !isRecord(evidence.stations)) return false;
  const stations = evidence.stations;
  const stationIds = Object.keys(stations);
  if (stationIds.some((id) => !LAB_STATION_IDS.includes(id))) return false;
  if (complete && LAB_STATION_IDS.some((id) => !stationIds.includes(id))) return false;
  for (const id of stationIds) {
    const station = stations[id];
    if (!isRecord(station)) return false;
    const notes = station.notes;
    if (!isRecord(notes)) return false;
    for (const key of ["prediction", "evidence", "conclusion"]) {
      if (!isText(notes[key]) || (complete && notes[key].trim().length < 3)) return false;
    }
  }
  if (!complete) return true;

  const chargeStudy = stations["charge-discharge"];
  const events = isRecord(chargeStudy) ? chargeStudy.events : null;
  if (!Array.isArray(events) || events.length < 3 || !events.every((event) => isText(event, 300))) return false;
  if (!events.some((event) => /nạp/i.test(event)) || !events.some((event) => /ngắt/i.test(event)) || !events.some((event) => /tải/i.test(event))) return false;

  const qU = stations["charge-voltage"];
  if (!isRecord(qU) || !finiteNumber(qU.plateArea, 0.0001, 1) || !finiteNumber(qU.plateDistance, 0.0001, 1) || !finiteNumber(qU.dielectric, 1, 1000)) return false;
  if (!Array.isArray(qU.measurements) || qU.measurements.length < 5 || qU.measurements.length > 10) return false;
  const theoreticalC = EPSILON_0 * qU.dielectric * qU.plateArea / qU.plateDistance;
  if (!finiteNumber(theoreticalC, Number.MIN_VALUE, 1e6)) return false;
  for (const [index, point] of qU.measurements.entries()) {
    if (!isRecord(point) || point.U !== index + 1 || !finiteNumber(point.Q, 0, 1e6)) return false;
    if (!closeEnough(point.Q, theoreticalC * point.U, 0.0051)) return false;
  }

  const factorStudy = stations["capacitance-factors"];
  if (!isRecord(factorStudy) || !Array.isArray(factorStudy.comparisons) || factorStudy.comparisons.length !== 3) return false;
  if (!factorStudy.comparisons.every((row) => isRecord(row) && finiteNumber(row.value, Number.MIN_VALUE, 1e6) && finiteNumber(row.capacitance, Number.MIN_VALUE, 1e6))) return false;

  const sourceStudy = stations["source-state"];
  if (!isRecord(sourceStudy) || typeof sourceStudy.sourceConnected !== "boolean" || !finiteNumber(sourceStudy.capacitance, Number.MIN_VALUE, 1e6) || !finiteNumber(sourceStudy.charge, 0, 1e6) || !finiteNumber(sourceStudy.voltage, 0, 1e6) || !finiteNumber(sourceStudy.isolatedCharge, 0, 1e6)) return false;
  const expectedSourceQ = sourceStudy.sourceConnected ? sourceStudy.capacitance * 12 : sourceStudy.isolatedCharge;
  if (!closeEnough(sourceStudy.charge, expectedSourceQ) || !closeEnough(sourceStudy.voltage, expectedSourceQ / sourceStudy.capacitance)) return false;

  const circuit = stations["circuit-builder"];
  if (!isRecord(circuit) || (circuit.topology !== "series" && circuit.topology !== "parallel") || !finiteNumber(circuit.capacitance1, 0.1, 1e6) || !finiteNumber(circuit.capacitance2, 0.1, 1e6) || !finiteNumber(circuit.sourceVoltage, 0.1, 1e6) || !finiteNumber(circuit.equivalentCapacitance, Number.MIN_VALUE, 1e6)) return false;
  const expectedEquivalent = circuit.topology === "series"
    ? circuit.capacitance1 * circuit.capacitance2 / (circuit.capacitance1 + circuit.capacitance2)
    : circuit.capacitance1 + circuit.capacitance2;
  if (!closeEnough(circuit.equivalentCapacitance, expectedEquivalent)) return false;

  const energy = stations["energy-graph"];
  if (!isRecord(energy) || !finiteNumber(energy.capacitanceMicrofarad, 0.1, 1e6) || !finiteNumber(energy.voltageMax, 1, 1e6) || !Array.isArray(energy.measurements) || energy.measurements.length !== 6) return false;
  for (const [index, point] of energy.measurements.entries()) {
    if (!isRecord(point)) return false;
    const expectedVoltage = energy.voltageMax * index / 5;
    const expectedCharge = energy.capacitanceMicrofarad * expectedVoltage;
    const expectedEnergy = 0.5 * energy.capacitanceMicrofarad * expectedVoltage * expectedVoltage / 1000;
    if (!closeEnough(point.U, expectedVoltage) || !closeEnough(point.Q, expectedCharge) || !closeEnough(point.W, expectedEnergy)) return false;
  }
  return true;
}
export async function GET(request: Request) {
  const access = await authorizeApi(["teacher", "student"], 120, "activity-evidence");
  if ("response" in access) return access.response;
  const activityId = Number(new URL(request.url).searchParams.get("activityId"));
  if (!Number.isInteger(activityId) || activityId < 1 || activityId > 14) {
    return NextResponse.json({ error: "Hoạt động không hợp lệ." }, { status: 400 });
  }

  if (access.profile.role === "student") {
    const { data: student } = await access.supabase.from("students").select("id").eq("auth_user_id", access.user.id).maybeSingle();
    if (!student) return NextResponse.json({ error: "Tài khoản chưa được gắn với hồ sơ học sinh." }, { status: 403 });
    const { data, error } = await access.supabase.from("activity_evidence").select("activity_id,evidence,score,score_max,completed_at,updated_at").eq("student_id", student.id).eq("activity_id", activityId).maybeSingle();
    if (error) return NextResponse.json({ error: "Không tải được sổ tay hoạt động." }, { status: 503 });
    return NextResponse.json({ record: data });
  }

  const { data, error } = await access.supabase.from("activity_evidence")
    .select("id,activity_id,student_id,evidence,score,score_max,completed_at,updated_at,students(full_name,class_name)")
    .eq("activity_id", activityId).order("updated_at", { ascending: false }).limit(500);
  if (error) return NextResponse.json({ error: "Không tải được hồ sơ hoạt động." }, { status: 503 });
  return NextResponse.json({ records: data || [] });
}

export async function POST(request: Request) {
  const access = await authorizeApi(["student"], 30, "activity-evidence");
  if ("response" in access) return access.response;
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: "Dịch vụ lưu hồ sơ chưa được cấu hình trên máy chủ." }, { status: 503 });
  }

  try {
    const declaredLength = Number(request.headers.get("content-length") || 0);
    if (declaredLength > MAX_BODY_BYTES) return NextResponse.json({ error: "Sổ tay vượt quá dung lượng cho phép." }, { status: 413 });
    const rawBody = await request.text();
    if (new TextEncoder().encode(rawBody).byteLength > MAX_BODY_BYTES) return NextResponse.json({ error: "Sổ tay vượt quá dung lượng cho phép." }, { status: 413 });
    const body = JSON.parse(rawBody) as { activityId?: unknown; evidence?: unknown; complete?: unknown };
    const activityId = Number(body.activityId);
    const complete = body.complete === true;
    if (!Number.isInteger(activityId) || activityId < 1 || activityId > 14 || !isRecord(body.evidence)) {
      return NextResponse.json({ error: "Thông tin hoạt động không hợp lệ." }, { status: 400 });
    }
    const evidence = body.evidence;
    let score: number | null = null;
    let scoreMax: number | null = null;
    if (QUIZ_ACTIVITY_IDS.has(activityId)) {
      if (!complete || evidence.kind !== "quiz" || !isRecord(evidence.answers)) {
        return NextResponse.json({ error: "Bài trắc nghiệm chưa hoàn chỉnh." }, { status: 400 });
      }
      score = scoreActivityQuiz(activityId, evidence.answers as Record<string, number>);
      if (score === null) return NextResponse.json({ error: "Câu trả lời chưa đủ hoặc không hợp lệ." }, { status: 400 });
      if (activityId === 7 && scoreActivityQuiz(activityId, evidence.firstAnswers as Record<string, number>) === null) {
        return NextResponse.json({ error: "Thiếu câu trả lời ở vòng bình chọn đầu." }, { status: 400 });
      }
      scoreMax = Object.keys(evidence.answers).length;
    } else if (LAB_ACTIVITY_IDS.has(activityId)) {
      if (!isValidLabEvidence(evidence, complete)) return NextResponse.json({ error: "Sổ tay thí nghiệm chưa đúng định dạng." }, { status: 400 });
    } else if (FORM_RESPONSE_FIELDS[activityId]) {
      if (!isValidWrittenEvidence(activityId, evidence, complete)) return NextResponse.json({ error: "Câu trả lời chưa đúng định dạng hoặc chưa đầy đủ." }, { status: 400 });
    } else {
      return NextResponse.json({ error: "Hoạt động này chưa hỗ trợ lưu hồ sơ trực tuyến." }, { status: 400 });
    }

    const { data: student } = await access.supabase.from("students").select("id").eq("auth_user_id", access.user.id).maybeSingle();
    if (!student) return NextResponse.json({ error: "Tài khoản chưa được gắn với hồ sơ học sinh." }, { status: 403 });
    const { data: activity, error: activityError } = await access.supabase.from("activities")
      .select("status,accepting_submissions,deadline").eq("id", activityId).maybeSingle();
    if (activityError || !activity) return NextResponse.json({ error: "Không tìm thấy hoạt động." }, { status: 404 });
    if (activity.status !== "available" || !activity.accepting_submissions || (activity.deadline && new Date(activity.deadline).getTime() < Date.now())) {
      return NextResponse.json({ error: "Hoạt động hiện không nhận câu trả lời." }, { status: 403 });
    }

    const admin = createSupabaseAdminClient();
    const { data: existing, error: existingError } = await admin.from("activity_evidence")
      .select("id,completed_at").eq("student_id", student.id).eq("activity_id", activityId).maybeSingle();
    if (existingError) return NextResponse.json({ error: "Không kiểm tra được hồ sơ đã lưu." }, { status: 503 });
    if (existing?.completed_at) return NextResponse.json({ error: "Hoạt động này đã được nộp và khóa chỉnh sửa." }, { status: 409 });

    const payload = {
      student_id: student.id,
      activity_id: activityId,
      evidence,
      score,
      score_max: scoreMax,
      completed_at: complete ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    };
    const savedResult = QUIZ_ACTIVITY_IDS.has(activityId)
      ? await admin.from("activity_evidence").insert(payload).select("activity_id,evidence,score,score_max,completed_at,updated_at").single()
      : existing
        ? await admin.from("activity_evidence").update(payload).eq("id", existing.id).is("completed_at", null).select("activity_id,evidence,score,score_max,completed_at,updated_at").maybeSingle()
        : await admin.from("activity_evidence").insert(payload).select("activity_id,evidence,score,score_max,completed_at,updated_at").single();
    if (savedResult.error) {
      if (savedResult.error.code === "23505") return NextResponse.json({ error: "Hoạt động này vừa được nộp hoặc cập nhật ở một thiết bị khác." }, { status: 409 });
      console.error("Activity evidence save failed", { code: savedResult.error.code });
      return NextResponse.json({ error: "Không lưu được sổ tay hoạt động." }, { status: 503 });
    }
    if (!savedResult.data) return NextResponse.json({ error: "Hồ sơ đã được nộp ở thiết bị khác; hãy tải lại để xem." }, { status: 409 });
    return NextResponse.json({ record: savedResult.data });
  } catch {
    return NextResponse.json({ error: "Không thể lưu hồ sơ hoạt động lúc này." }, { status: 400 });
  }
}
