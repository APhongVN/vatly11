"use client";

import { useEffect, useState } from "react";
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";

type Q = { id: string; question: string; options: string[] };
type Phase = "first-vote" | "discussion" | "second-vote" | "practice";

export default function Quiz({ activityId, questions }: { activityId: number; questions: Q[] }) {
  const [current, setCurrent] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [firstAnswers, setFirstAnswers] = useState<Record<string, number>>({});
  const [phase, setPhase] = useState<Phase>(activityId === 7 ? "first-vote" : "practice");
  const [finished, setFinished] = useState(false);
  const [savedScore, setSavedScore] = useState<number | null>(null);
  const [previewMode, setPreviewMode] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const question = questions[current];
  const currentAnswers = phase === "first-vote" ? firstAnswers : answers;

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/activity-evidence?activityId=${activityId}`, { cache: "no-store" })
      .then(async (response) => {
        if (response.status === 401) { if (!cancelled) setPreviewMode(true); return null; }
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "Không tải được kết quả đã lưu.");
        return result.record;
      })
      .then((record) => {
        if (cancelled || !record) return;
        if (record.completed_at && record.evidence?.kind === "quiz") {
          setSavedScore(Number(record.score));
          setAnswers(record.evidence.answers || {});
          setFinished(true);
        }
      })
      .catch((loadError: unknown) => { if (!cancelled) setError(loadError instanceof Error ? loadError.message : "Không tải được kết quả đã lưu."); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [activityId]);

  const submitScore = async (finalAnswers: Record<string, number>, initialAnswers: Record<string, number>) => {
    setSaving(true);
    setError("");
    try {
      const response = await fetch("/api/activity-evidence", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ activityId, complete: true, evidence: { kind: "quiz", answers: finalAnswers, ...(activityId === 7 ? { firstAnswers: initialAnswers } : {}) } }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Không lưu được kết quả.");
      setSavedScore(Number(result.record.score));
      setFinished(true);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Không lưu được kết quả.");
    } finally { setSaving(false); }
  };

  const advance = () => {
    if (selected === null || !question) return;
    if (phase === "first-vote") {
      const updated = { ...firstAnswers, [question.id]: selected };
      setFirstAnswers(updated);
      if (current + 1 >= questions.length) {
        setPhase("discussion");
        setCurrent(0);
        setSelected(null);
      } else {
        setCurrent((index) => index + 1);
        setSelected(null);
      }
      return;
    }

    const updated = { ...answers, [question.id]: selected };
    setAnswers(updated);
    if (current + 1 < questions.length) {
      setCurrent((index) => index + 1);
      setSelected(null);
      return;
    }

    if (phase === "second-vote") {
      void submitScore(updated, firstAnswers);
    } else {
      void submitScore(updated, {});
    }
  };

  if (loading) return <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500">Đang tải câu trả lời đã lưu…</div>;

  if (finished) {
    return <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6 text-center">
      <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-700" />
      <h3 className="mt-3 text-xl font-extrabold text-emerald-950">Đã lưu kết quả</h3>
      <p className="mt-2 text-lg">Điểm: <b className="text-emerald-800">{savedScore}/{questions.length}</b></p>
      <p className="mt-2 text-sm text-emerald-900">Câu trả lời đã được chấm trên máy chủ và lưu vào hồ sơ lớp để giáo viên theo dõi.</p>
    </div>;
  }

  if (phase === "discussion") {
    return <div className="space-y-4 rounded-2xl border border-violet-200 bg-violet-50 p-6 text-center">
      <h3 className="text-xl font-extrabold text-violet-950">Thảo luận cặp · 2 phút</h3>
      <p className="text-sm leading-6 text-violet-900">Hãy giải thích lí do cho lựa chọn ở vòng đầu, lắng nghe ý kiến bạn và kiểm tra lại bằng chứng. Sau đó bình chọn lần hai. Giáo viên có thể xem câu trả lời trước và sau thảo luận.</p>
      <button type="button" onClick={() => { setPhase("second-vote"); setCurrent(0); setSelected(null); }} className="rounded-xl bg-violet-700 px-5 py-3 text-sm font-bold text-white">Bắt đầu bình chọn lại</button>
    </div>;
  }

  const selectedMap = phase === "first-vote" ? firstAnswers : answers;
  return (
    <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5">
      <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-slate-600"><span>{phase === "first-vote" ? "Bình chọn cá nhân lần 1" : phase === "second-vote" ? "Bình chọn sau thảo luận" : "Câu hỏi"} · {current + 1}/{questions.length}</span><span>Đã trả lời {Object.keys(selectedMap).length}/{questions.length}</span></div>
      {previewMode && <p className="flex items-center gap-2 rounded-xl bg-amber-50 p-3 text-xs text-amber-900"><AlertCircle className="h-4 w-4 shrink-0"/>Bản xem thử: có thể xem câu hỏi, nhưng cần tài khoản học sinh để chấm và lưu kết quả.</p>}
      <div className="h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-blue-700 transition-all" style={{ width: `${((current + 1) / questions.length) * 100}%` }} /></div>
      <h3 className="text-lg font-bold text-slate-900">{question?.question}</h3>
      <div className="space-y-2">{question?.options.map((option, index) => <label key={index} className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 text-sm transition ${selected === index ? "border-blue-600 bg-blue-50" : "border-slate-200 hover:bg-slate-50"}`}><input type="radio" name={`activity-${activityId}-${phase}-${question.id}`} checked={selected === index} onChange={() => setSelected(index)} /><span>{option}</span></label>)}</div>
      {error && <p role="alert" className="rounded-xl bg-rose-50 p-3 text-sm text-rose-800">{error}</p>}
      <button type="button" onClick={advance} disabled={selected === null || saving} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-700 px-4 py-3 text-sm font-bold text-white disabled:opacity-50">{saving ? <Loader2 className="h-4 w-4 animate-spin"/> : null}{saving ? "Đang chấm và lưu…" : current + 1 < questions.length ? "Câu tiếp theo →" : phase === "first-vote" ? "Hoàn tất bình chọn lần 1" : phase === "second-vote" ? "Nộp bình chọn lần 2" : "Nộp bài và xem điểm"}</button>
      <p className="text-xs text-slate-500">Đáp án được chấm ở máy chủ. Mỗi học sinh chỉ nộp một kết quả chính thức cho hoạt động này.</p>
    </div>
  );
}
