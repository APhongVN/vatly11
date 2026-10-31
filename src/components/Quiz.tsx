"use client";

import { useEffect, useState } from "react";
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { READINESS_TOPICS } from "@/lib/readiness-check.mjs";

type Q = { id: string; question: string; options: string[] };
function renderPeerHistogram(questions: Q[], results: Array<{ questionId: string; first: number[] | null; second: number[] | null }> | null, phase: "first" | "second") {
  if (!results) return null;
  return <div className="space-y-3 rounded-xl border border-violet-200 bg-white p-4 text-left">
    {results.map((result) => {
      const question = questions.find((item) => item.id === result.questionId);
      const counts = phase === "first" ? result.first : result.second;
      if (!question) return null;
      return <div key={result.questionId} className="space-y-2">
        <p className="text-sm font-bold text-slate-800">{result.questionId}. {question.question}</p>
        {counts ? question.options.map((option, index) => {
          const total = counts.reduce((sum, count) => sum + count, 0);
          const percent = total ? Math.round((counts[index] / total) * 100) : 0;
          return <div key={option} className="space-y-1 text-xs text-slate-600">
            <div className="flex justify-between gap-2"><span>{option}</span><span>{counts[index]} lượt · {percent}%</span></div>
            <div className="h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-violet-600 transition-all" style={{ width: percent + "%" }} /></div>
          </div>;
        }) : <p className="text-xs text-slate-500">Chưa đủ 5 lượt bình chọn để hiện biểu đồ ẩn danh.</p>}
      </div>;
    })}
  </div>;
}
type Phase = "first-vote" | "discussion" | "second-vote" | "readiness-reflection" | "practice";

export default function Quiz({ activityId, questions }: { activityId: number; questions: Q[] }) {
  const [current, setCurrent] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [firstAnswers, setFirstAnswers] = useState<Record<string, number>>({});
  const [phase, setPhase] = useState<Phase>(activityId === 7 ? "first-vote" : "practice");
  const [finished, setFinished] = useState(false);
  const [savedScore, setSavedScore] = useState<number | null>(null);
  const [muddyTopics, setMuddyTopics] = useState<string[]>([]);
  const [muddyPoint, setMuddyPoint] = useState("");
  const [confidence, setConfidence] = useState<"sure" | "partial" | "unsure">("partial");
  const [previewMode, setPreviewMode] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [discussionSeconds, setDiscussionSeconds] = useState(120);
  const [pollResults, setPollResults] = useState<Array<{ questionId: string; first: number[] | null; second: number[] | null }> | null>(null);
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
        if (record.completed_at && record.evidence?.kind === "readiness-check") {
          setAnswers(record.evidence.answers || {});
          setMuddyTopics(record.evidence.muddyTopics || []);
          setMuddyPoint(record.evidence.muddyPoint || "");
          setConfidence(record.evidence.confidence || "partial");
          setFinished(true);
        } else if (record.completed_at && record.evidence?.kind === "quiz") {
          setSavedScore(Number(record.score));
          setAnswers(record.evidence.answers || {});
          setFinished(true);
        }
      })
      .catch((loadError: unknown) => { if (!cancelled) setError(loadError instanceof Error ? loadError.message : "Không tải được kết quả đã lưu."); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [activityId]);

  useEffect(() => {
    if (activityId !== 7) return;
    let cancelled = false;
    fetch("/api/peer-votes", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) return null;
        return response.json();
      })
      .then((result) => {
        if (cancelled || !result) return;
        setPollResults(result.results || null);
        const first = result.myFirstAnswers || {};
        const second = result.mySecondAnswers || {};
        if (Object.keys(first).length === questions.length) {
          setFirstAnswers(first);
          if (Object.keys(second).length === questions.length) {
            setAnswers(second);
            setPhase("second-vote");
          } else {
            setPhase("discussion");
          }
        }
      })
      .catch(() => undefined);
    return () => { cancelled = true; };
  }, [activityId, questions.length]);

  useEffect(() => {
    if (phase !== "discussion") return;
    setDiscussionSeconds(120);
    const endAt = Date.now() + 120_000;
    const timer = window.setInterval(() => {
      const remaining = Math.max(0, Math.ceil((endAt - Date.now()) / 1000));
      setDiscussionSeconds(remaining);
      if (remaining === 0) window.clearInterval(timer);
    }, 250);
    return () => window.clearInterval(timer);
  }, [phase]);

  const saveFirstVote = async (vote: Record<string, number>) => {
    if (previewMode) { setFirstAnswers(vote); setPhase("discussion"); return; }
    setSaving(true);
    setError("");
    try {
      const response = await fetch("/api/peer-votes", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phase: "first", answers: vote }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Không lưu được lượt bình chọn đầu.");
      setPollResults(result.results || null);
      setFirstAnswers(vote);
      setPhase("discussion");
    } catch (voteError) {
      setError(voteError instanceof Error ? voteError.message : "Không lưu được lượt bình chọn đầu.");
    } finally {
      setSaving(false);
    }
  };
  const submitScore = async (finalAnswers: Record<string, number>, initialAnswers: Record<string, number>) => {
    if (previewMode) { setError("Bản xem thử không ghi điểm. Đăng nhập học sinh để lưu kết quả."); return; }
    setSaving(true);
    setError("");
    try {
      if (activityId === 7) {
        const voteResponse = await fetch("/api/peer-votes", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ phase: "second", answers: finalAnswers }),
        });
        const voteResult = await voteResponse.json();
        if (!voteResponse.ok) throw new Error(voteResult.error || "Không lưu được lượt bình chọn sau thảo luận.");
        setPollResults(voteResult.results || null);
      }
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

  const submitReadiness = async () => {
    if (previewMode) { setError("Bản xem thử chỉ để đọc. Phản hồi sẽ được lưu khi học sinh có tài khoản."); return; }
    if (muddyTopics.length === 0 || muddyPoint.trim().length < 10) { setError("Hãy chọn ít nhất một chủ đề và mô tả điều em còn băn khoăn (tối thiểu 10 ký tự)."); return; }
    setSaving(true);
    setError("");
    try {
      const response = await fetch("/api/activity-evidence", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ activityId: 6, complete: true, evidence: { kind: "readiness-check", answers, muddyTopics, muddyPoint: muddyPoint.trim(), confidence } }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Không lưu được khảo sát.");
      setFinished(true);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Không lưu được khảo sát.");
    } finally { setSaving(false); }
  };
  const advance = () => {
    if (selected === null || !question) return;
    if (phase === "first-vote") {
      const updated = { ...firstAnswers, [question.id]: selected };
      setFirstAnswers(updated);
      if (current + 1 >= questions.length) {
        void saveFirstVote(updated);
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
    } else if (activityId === 6) {
      setPhase("readiness-reflection");
    } else {
      void submitScore(updated, {});
    }
  };

  if (loading) return <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500">Đang tải câu trả lời đã lưu…</div>;

  if (finished) {
    if (activityId === 6) return <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6 text-center">
      <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-700" />
      <h3 className="mt-3 text-xl font-extrabold text-emerald-950">Đã lưu khảo sát mức sẵn sàng</h3>
      <p className="mt-2 text-sm text-emerald-900">Hoạt động này không chấm điểm đúng sai. Giáo viên sẽ xem các chủ đề lớp đang cần hỗ trợ.</p>
      <p className="mt-3 text-left text-sm text-emerald-900"><b>Chủ đề em chọn:</b> {muddyTopics.map((id) => READINESS_TOPICS.find((topic) => topic.id === id)?.label).filter(Boolean).join("; ")}</p>
    </div>;
    return <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6 text-center">
      <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-700" />
      <h3 className="mt-3 text-xl font-extrabold text-emerald-950">Đã lưu kết quả</h3>
      <p className="mt-2 text-lg">Điểm: <b className="text-emerald-800">{savedScore}/{questions.length}</b></p>
      <p className="mt-2 text-sm text-emerald-900">Câu trả lời đã được chấm trên máy chủ và lưu vào hồ sơ lớp để giáo viên theo dõi.</p>
      {activityId === 7 && <div className="mt-5 space-y-4 text-left">{renderPeerHistogram(questions, pollResults, "first")}{renderPeerHistogram(questions, pollResults, "second")}</div>}
    </div>;
  }

  if (phase === "discussion") {
    return <div className="space-y-4 rounded-2xl border border-violet-200 bg-violet-50 p-6 text-center">
      <h3 className="text-xl font-extrabold text-violet-950">Thảo luận cặp · 2 phút</h3>
      <p className="text-sm leading-6 text-violet-900">Hãy giải thích lí do cho lựa chọn ở vòng đầu, lắng nghe ý kiến bạn và kiểm tra lại bằng chứng. Sau đó bình chọn lần hai. Lựa chọn cá nhân chỉ được tổng hợp ẩn danh khi có ít nhất năm lượt.</p>
      {renderPeerHistogram(questions, pollResults, "first")}
      <p className="text-2xl font-black tabular-nums text-violet-950">{Math.floor(discussionSeconds / 60)}:{String(discussionSeconds % 60).padStart(2, "0")}</p>
      <p className="text-xs text-violet-800">Dành đủ hai phút để trao đổi trước khi bình chọn lại.</p>
      <button type="button" disabled={discussionSeconds > 0} onClick={() => { setPhase("second-vote"); setCurrent(0); setSelected(null); }} className="rounded-xl bg-violet-700 px-5 py-3 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-50">{discussionSeconds > 0 ? "Đang thảo luận…" : "Bắt đầu bình chọn lại"}</button>
    </div>;
  }

  if (phase === "readiness-reflection") return <div className="space-y-5 rounded-2xl border border-amber-200 bg-amber-50 p-5">
    <div><h3 className="text-lg font-extrabold text-amber-950">Phiếu tự nhận diện điểm còn băn khoăn</h3><p className="mt-1 text-sm leading-6 text-amber-900">Đây là khảo sát để cô chuẩn bị bài học, không có đáp án đúng sai và không tính điểm.</p></div>
    <fieldset><legend className="mb-2 text-sm font-bold text-slate-800">Chọn chủ đề em muốn được giải thích thêm</legend><div className="grid gap-2 sm:grid-cols-2">{READINESS_TOPICS.map((topic) => <label key={topic.id} className="flex items-start gap-2 rounded-xl border border-amber-100 bg-white p-3 text-sm"><input type="checkbox" checked={muddyTopics.includes(topic.id)} onChange={(event) => setMuddyTopics((current) => event.target.checked ? [...current, topic.id] : current.filter((id) => id !== topic.id))} className="mt-0.5"/><span>{topic.label}</span></label>)}</div></fieldset>
    <label className="block text-sm font-bold text-slate-800">Điều em còn băn khoăn<textarea value={muddyPoint} onChange={(event) => setMuddyPoint(event.target.value)} maxLength={1500} rows={4} placeholder="Ví dụ: Em chưa rõ vì sao điện tích giữ nguyên khi ngắt nguồn nhưng điện áp có thể đổi…" className="mt-2 w-full rounded-xl border border-slate-200 bg-white p-3 text-sm font-normal"/></label>
    <label className="block text-sm font-bold text-slate-800">Mức độ tự tin hiện tại<select value={confidence} onChange={(event) => setConfidence(event.target.value as "sure" | "partial" | "unsure")} className="mt-2 block w-full rounded-xl border border-slate-200 bg-white p-3 text-sm"><option value="sure">Em khá tự tin</option><option value="partial">Em hiểu một phần</option><option value="unsure">Em cần được hướng dẫn lại</option></select></label>
    {error && <p role="alert" className="rounded-xl bg-rose-50 p-3 text-sm text-rose-800">{error}</p>}
    <button type="button" onClick={() => void submitReadiness()} disabled={saving || previewMode} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-amber-700 px-4 py-3 text-sm font-bold text-white disabled:opacity-50">{saving ? <Loader2 className="h-4 w-4 animate-spin"/> : null}{saving ? "Đang lưu phản hồi…" : "Gửi phiếu tự nhận diện"}</button>
  </div>;
  const selectedMap = phase === "first-vote" ? firstAnswers : answers;
  return (
    <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5">
      <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-slate-600"><span>{phase === "first-vote" ? "Bình chọn cá nhân lần 1" : phase === "second-vote" ? "Bình chọn sau thảo luận" : "Câu hỏi"} · {current + 1}/{questions.length}</span><span>Đã trả lời {Object.keys(selectedMap).length}/{questions.length}</span></div>
      {previewMode && <p className="flex items-center gap-2 rounded-xl bg-amber-50 p-3 text-xs text-amber-900"><AlertCircle className="h-4 w-4 shrink-0"/>{activityId === 6 ? "Bản xem thử: khảo sát không có điểm; cần tài khoản học sinh để gửi phản hồi." : "Bản xem thử: có thể xem câu hỏi, nhưng cần tài khoản học sinh để chấm và lưu kết quả."}</p>}
      <div className="h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-blue-700 transition-all" style={{ width: `${((current + 1) / questions.length) * 100}%` }} /></div>
      {activityId === 7 && phase === "second-vote" && renderPeerHistogram(questions, pollResults, "second")}
      <h3 className="text-lg font-bold text-slate-900">{question?.question}</h3>
      <div className="space-y-2">{question?.options.map((option, index) => <label key={index} className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 text-sm transition ${selected === index ? "border-blue-600 bg-blue-50" : "border-slate-200 hover:bg-slate-50"}`}><input type="radio" name={`activity-${activityId}-${phase}-${question.id}`} checked={selected === index} onChange={() => setSelected(index)} /><span>{option}</span></label>)}</div>
      {error && <p role="alert" className="rounded-xl bg-rose-50 p-3 text-sm text-rose-800">{error}</p>}
      <button type="button" onClick={advance} disabled={selected === null || saving} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-700 px-4 py-3 text-sm font-bold text-white disabled:opacity-50">{saving ? <Loader2 className="h-4 w-4 animate-spin"/> : null}{saving ? (activityId === 6 ? "Đang lưu…" : "Đang chấm và lưu…") : current + 1 < questions.length ? "Câu tiếp theo →" : phase === "first-vote" ? "Hoàn tất bình chọn lần 1" : phase === "second-vote" ? "Nộp bình chọn lần 2" : activityId === 6 ? "Tiếp tục phiếu tự nhận diện" : "Nộp bài và xem điểm"}</button>
      {activityId === 6 ? <p className="text-xs text-slate-500">Khảo sát không chấm điểm; câu trả lời chỉ giúp giáo viên chọn nội dung cần giảng kỹ hơn.</p> : <p className="text-xs text-slate-500">Đáp án được chấm ở máy chủ. Mỗi học sinh chỉ nộp một kết quả chính thức cho hoạt động này.</p>}
    </div>
  );
}
