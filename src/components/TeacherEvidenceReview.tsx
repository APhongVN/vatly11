"use client";

import { useState } from "react";
import { Bot, CheckCircle2, LoaderCircle, Save } from "lucide-react";
import { supabase } from "@/lib/supabase";

type Evidence = Record<string, unknown>;
type Props = {
  recordId: string;
  activityId: number;
  evidence: Evidence;
  completedAt: string | null;
  aiScore: number | null;
  aiFeedback: string | null;
  aiStrengths: string | null;
  aiWeaknesses: string | null;
  aiModelAnswer: string | null;
  teacherScore: number | null;
  teacherFeedback: string | null;
  previewMode: boolean;
  onReviewed: (score: number, feedback: string) => void;
};

function evidenceForGrading(evidence: Evidence) {
  const kind = evidence.kind;
  const lines: string[] = [`Loại sản phẩm: ${String(kind || "hoạt động")}`];
  const appendRecord = (heading: string, value: unknown) => {
    if (!value || typeof value !== "object" || Array.isArray(value)) return;
    lines.push(heading);
    for (const [key, answer] of Object.entries(value as Record<string, unknown>)) {
      if (typeof answer === "string" && answer.trim()) lines.push(`${key}: ${answer.trim().slice(0, 500)}`);
    }
  };
  if (kind === "written-response") appendRecord("Câu trả lời:", evidence.responses);
  else if (kind === "microteaching") appendRecord("Checkpoint:", evidence.answers);
  else if (kind === "project-submission") {
    appendRecord("Bản thuyết minh dự án:", evidence.responses);
    if (typeof evidence.projectLink === "string" && evidence.projectLink.trim()) lines.push(`Link sản phẩm: ${evidence.projectLink.slice(0, 1000)}`);
    if (Array.isArray(evidence.attachments)) lines.push(`Tệp sản phẩm đã nộp: ${evidence.attachments.length} tệp. Giáo viên cần mở và đối chiếu tệp riêng.`);
  } else if (kind === "virtual-lab" && evidence.stations && typeof evidence.stations === "object") {
    for (const [id, station] of Object.entries(evidence.stations as Record<string, unknown>)) {
      if (!station || typeof station !== "object" || Array.isArray(station)) continue;
      lines.push(`Trạm ${id}:`);
      appendRecord("Ghi chép:", (station as Record<string, unknown>).notes);
      for (const [key, value] of Object.entries(station as Record<string, unknown>)) {
        if (key !== "notes") lines.push(`${key}: ${JSON.stringify(value).slice(0, 800)}`);
      }
    }
  } else {
    lines.push(JSON.stringify(evidence).slice(0, 9000));
  }
  return lines.join("\n").slice(0, 11000);
}

export default function TeacherEvidenceReview(props: Props) {
  const [aiScore, setAiScore] = useState<number | null>(props.aiScore);
  const [aiFeedback, setAiFeedback] = useState(props.aiFeedback || "");
  const [strengths, setStrengths] = useState(props.aiStrengths || "");
  const [weaknesses, setWeaknesses] = useState(props.aiWeaknesses || "");
  const [modelAnswer, setModelAnswer] = useState(props.aiModelAnswer || "");
  const [scoreDraft, setScoreDraft] = useState(props.teacherScore === null ? "" : String(props.teacherScore));
  const [feedbackDraft, setFeedbackDraft] = useState(props.teacherFeedback || "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  if (!props.completedAt || props.evidence.kind === "quiz") return null;

  const requestAiGrade = async () => {
    if (busy) return;
    if (props.previewMode) {
      setBusy(true); setError(""); setNotice("");
      window.setTimeout(() => {
        setAiScore(8); setAiFeedback("Gợi ý mô phỏng: học sinh đã có quy luật Q tăng theo U và nêu được ý nghĩa điện dung.");
        setStrengths("Dữ liệu đo có xu hướng rõ và có kết luận phù hợp.");
        setWeaknesses("Cần ghi đầy đủ đơn vị, sai số và điều kiện thí nghiệm.");
        setModelAnswer("Với tụ có C không đổi: Q = CU, nên đồ thị Q theo U là đường thẳng; hệ số góc chính là C.");
        setScoreDraft((current) => current || "8");
        setNotice("Đã tạo gợi ý chấm AI mô phỏng. Cô có thể sửa điểm cuối để thử luồng duyệt.");
        setBusy(false);
      }, 300);
      return;
    }
    setBusy(true); setError(""); setNotice("");
    try {
      const response = await fetch("/api/grade", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ activityId: props.activityId, studentAnswer: evidenceForGrading(props.evidence) }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "AI chưa chấm được bài này.");
      if (typeof result.score !== "number" || !Number.isFinite(result.score) || result.score < 0 || result.score > 10) throw new Error("Điểm AI trả về không hợp lệ.");
      const { error: saveError } = await supabase.from("activity_evidence").update({
        ai_score: result.score,
        ai_feedback: String(result.feedback || "").slice(0, 4000),
        ai_strengths: String(result.strengths || "").slice(0, 2000),
        ai_weaknesses: String(result.weaknesses || "").slice(0, 2000),
        ai_model_answer: String(result.model_answer || "").slice(0, 4000),
        updated_at: new Date().toISOString(),
      }).eq("id", props.recordId);
      if (saveError) throw new Error("AI đã chấm nhưng chưa lưu được nhận xét vào hồ sơ: " + saveError.message);
      setAiScore(result.score); setAiFeedback(String(result.feedback || "")); setStrengths(String(result.strengths || "")); setWeaknesses(String(result.weaknesses || "")); setModelAnswer(String(result.model_answer || ""));
      setScoreDraft((current) => current || String(result.score));
      setNotice("Đã lưu gợi ý AI. Điểm này chưa phải điểm cuối cho đến khi cô duyệt.");
    } catch (gradeError) { setError(gradeError instanceof Error ? gradeError.message : "AI chưa chấm được bài này."); }
    finally { setBusy(false); }
  };

  const saveTeacherGrade = async () => {
    if (busy) return;
    const score = Number(scoreDraft);
    if (!scoreDraft.trim() || !Number.isFinite(score) || score < 0 || score > 10) { setError("Điểm cuối phải nằm trong khoảng 0–10."); return; }
    if (props.previewMode) {
      props.onReviewed(score, feedbackDraft.trim());
      setNotice("Đã lưu điểm cuối mô phỏng vào hồ sơ mẫu.");
      return;
    }
    setBusy(true); setError(""); setNotice("");
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) throw new Error("Phiên giáo viên đã hết hạn. Hãy đăng nhập lại.");
      const { error: saveError } = await supabase.from("activity_evidence").update({
        teacher_score: score,
        teacher_feedback: feedbackDraft.trim().slice(0, 4000) || null,
        graded_by: user.id,
        graded_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }).eq("id", props.recordId);
      if (saveError) throw new Error("Không lưu được điểm duyệt: " + saveError.message);
      props.onReviewed(score, feedbackDraft.trim());
      setNotice("Đã lưu điểm cuối và nhận xét của giáo viên.");
    } catch (saveError) { setError(saveError instanceof Error ? saveError.message : "Không lưu được điểm cuối."); }
    finally { setBusy(false); }
  };

  return <section className="mt-3 rounded-2xl border border-indigo-100 bg-indigo-50/60 p-4">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><h4 className="text-sm font-extrabold text-slate-900">Chấm và duyệt của giáo viên</h4><p className="mt-1 text-xs text-slate-600">AI là điểm gợi ý theo rubric; chỉ điểm giáo viên duyệt mới là điểm cuối.</p></div><button type="button" onClick={() => void requestAiGrade()} disabled={busy} className="inline-flex items-center gap-2 rounded-xl bg-indigo-700 px-3 py-2 text-xs font-bold text-white disabled:opacity-50">{busy ? <LoaderCircle className="h-4 w-4 animate-spin"/> : <Bot className="h-4 w-4"/>}{aiScore === null ? "Chấm sơ bộ bằng AI" : "Chấm AI lại"}</button></div>
    {aiScore !== null && <div className="mt-3 rounded-xl border border-indigo-100 bg-white p-3 text-sm"><p className="font-bold text-indigo-900">Gợi ý AI: {aiScore}/10 <span className="font-normal text-slate-500">· chưa duyệt</span></p>{aiFeedback && <p className="mt-2 whitespace-pre-wrap text-xs leading-5 text-slate-700">{aiFeedback}</p>}<div className="mt-2 grid gap-2 text-xs md:grid-cols-2">{strengths && <p><b>Điểm mạnh:</b> {strengths}</p>}{weaknesses && <p><b>Cần cải thiện:</b> {weaknesses}</p>}</div>{modelAnswer && <details className="mt-2"><summary className="cursor-pointer text-xs font-bold text-slate-600">Mở gợi ý đáp án cho giáo viên</summary><p className="mt-2 whitespace-pre-wrap text-xs leading-5 text-slate-700">{modelAnswer}</p></details>}</div>}
    <div className="mt-3 grid gap-3 md:grid-cols-[140px_1fr_auto]"><label className="text-xs font-bold text-slate-700">Điểm cuối / 10<input type="number" min="0" max="10" step="0.5" value={scoreDraft} onChange={(event) => setScoreDraft(event.target.value)} disabled={busy} className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm disabled:bg-slate-100" placeholder="0–10" /></label><label className="text-xs font-bold text-slate-700">Nhận xét gửi học sinh<textarea value={feedbackDraft} onChange={(event) => setFeedbackDraft(event.target.value)} disabled={busy} maxLength={4000} rows={2} className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-normal leading-5 disabled:bg-slate-100" placeholder="Nhận xét, hướng cải thiện hoặc lý do điều chỉnh điểm…" /></label><button type="button" onClick={() => void saveTeacherGrade()} disabled={busy || !scoreDraft.trim()} className="inline-flex items-center justify-center gap-2 self-end rounded-xl bg-emerald-700 px-3 py-2 text-xs font-bold text-white disabled:opacity-50">{busy ? <LoaderCircle className="h-4 w-4 animate-spin"/> : <Save className="h-4 w-4"/>}Duyệt điểm</button></div>
    {error && <p role="alert" className="mt-3 rounded-lg bg-rose-50 p-2 text-xs text-rose-800">{error}</p>}{notice && <p role="status" className="mt-3 rounded-lg bg-emerald-50 p-2 text-xs text-emerald-800"><CheckCircle2 className="mr-1 inline h-3.5 w-3.5"/>{notice}</p>}
  </section>;
}
