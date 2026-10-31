"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Loader2, Save } from "lucide-react";

type Field = { key: string; label: string; prompt: string };
type FormDefinition = { title: string; fields: Field[] };
const FORM_DEFINITIONS: Record<number, FormDefinition> = {
  1: { title: "Ghi lại suy nghĩ ban đầu", fields: [
    { key: "prediction", label: "Dự đoán hiện tượng", prompt: "Sau khi ngắt nguồn và nối tụ với LED, em dự đoán điều gì sẽ xảy ra?" },
    { key: "explanation", label: "Giải thích ban đầu", prompt: "Vì sao em đưa ra dự đoán đó?" },
    { key: "question", label: "Câu hỏi nghiên cứu", prompt: "Bài học cần trả lời câu hỏi nào về tụ điện?" },
  ] },
  3: { title: "Bốn giả thuyết cá nhân", fields: [
    { key: "hyp_q_u", label: "HYP-Q-U · Q phụ thuộc U", prompt: "Với cùng một tụ điện, khi U tăng thì Q thay đổi thế nào?" },
    { key: "hyp_c_s", label: "HYP-C-S · C phụ thuộc S", prompt: "Giữ d và εr không đổi, tăng diện tích bản S thì C thay đổi thế nào?" },
    { key: "hyp_c_d", label: "HYP-C-D · C phụ thuộc d", prompt: "Giữ S và εr không đổi, tăng khoảng cách d thì C thay đổi thế nào?" },
    { key: "hyp_c_eps", label: "HYP-C-εr · C phụ thuộc điện môi", prompt: "Giữ S và d không đổi, tăng εr thì C thay đổi thế nào?" },
  ] },
  5: { title: "Prediction · Evidence · Revision", fields: [
    { key: "prediction", label: "Prediction · Dự đoán", prompt: "Trước khi xem thí nghiệm thật, em dự đoán điều gì?" },
    { key: "evidence", label: "Evidence · Bằng chứng", prompt: "Ghi lại điều quan sát được từ video hoặc thí nghiệm: trạng thái nguồn, LED và diễn biến theo thời gian." },
    { key: "revision", label: "Revision · Điều chỉnh", prompt: "Bằng chứng có khiến em giữ nguyên hay sửa dự đoán? Giải thích vì sao." },
  ] },
  14: { title: "Phản tư và luyện tập giãn cách", fields: [
    { key: "ref1", label: "REF1 · Nhìn lại dự đoán", prompt: "Dự đoán nào của em ở đầu bài đã thay đổi nhiều nhất? Vì sao?" },
    { key: "ref2", label: "REF2 · Bằng chứng thuyết phục", prompt: "Bằng chứng thực nghiệm hoặc đồ thị nào thuyết phục em nhất?" },
    { key: "ref3", label: "REF3 · Sửa một ngộ nhận", prompt: "Một lỗi em từng mắc khi phân biệt Q, U và C là gì? Em sửa nó như thế nào?" },
    { key: "ref4", label: "REF4 · Cải thiện thí nghiệm", prompt: "Nếu được làm lại một thí nghiệm, em sẽ thay đổi cách thu dữ liệu nào để kết luận chắc chắn hơn?" },
    { key: "d1", label: "D1 · Tính điện tích", prompt: "Tụ C=50 μF ở U=20 V. Tính Q." },
    { key: "d2", label: "D2 · Tính năng lượng", prompt: "Tụ trên có năng lượng điện trường W bằng bao nhiêu?" },
    { key: "d3", label: "D3 · Còn nối nguồn", prompt: "Tụ vẫn nối nguồn. Tăng S lên 2 lần. Nhận xét C, Q và U." },
    { key: "d4", label: "D4 · Đã ngắt nguồn", prompt: "Tụ đã ngắt nguồn. Tăng S lên 2 lần. Nhận xét C, Q, U và W." },
    { key: "d5", label: "D5 · Đồ thị Q=f(U)", prompt: "Đồ thị Q=f(U) của tụ A dốc gấp 2 lần tụ B. So sánh C_A và C_B." },
    { key: "d6", label: "D6 · Đồ thị U=f(Q)", prompt: "Đồ thị U=f(Q) của tụ A dốc gấp 2 lần tụ B. So sánh C_A và C_B." },
    { key: "d7", label: "D7 · Ghép song song", prompt: "Hai tụ 3 μF và 6 μF mắc song song. Tính C tương đương." },
    { key: "d8", label: "D8 · Ghép nối tiếp", prompt: "Hai tụ 3 μF và 6 μF mắc nối tiếp. Tính C tương đương." },
  ] },
};

export default function ActivityResponseForm({ activityId }: { activityId: number }) {
  const definition = FORM_DEFINITIONS[activityId];
  const [responses, setResponses] = useState<Record<string, string>>({});
  const [previewMode, setPreviewMode] = useState(false);
  const [readOnly, setReadOnly] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/activity-evidence?activityId=${activityId}`, { cache: "no-store" })
      .then(async (response) => {
        if (response.status === 401) { if (!cancelled) setPreviewMode(true); return null; }
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "Không tải được bài làm đã lưu.");
        return result.record;
      })
      .then((record) => {
        if (cancelled || !record || record.evidence?.kind !== "written-response") return;
        setResponses(record.evidence.responses || {});
        setReadOnly(Boolean(record.completed_at));
      })
      .catch((loadError: unknown) => { if (!cancelled) setError(loadError instanceof Error ? loadError.message : "Không tải được bài làm."); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [activityId]);

  if (!definition) return null;
  const isComplete = definition.fields.every(({ key }) => (responses[key] || "").trim().length >= 3);
  const save = async (complete: boolean) => {
    if (previewMode) { setMessage("Bản xem trước không ghi dữ liệu thật. Đăng nhập học sinh để lưu bài."); return; }
    if (readOnly) { setMessage("Bài làm đã nộp và chờ giáo viên xem."); return; }
    if (complete && !isComplete) { setError("Hãy trả lời đầy đủ các câu hỏi trước khi nộp."); return; }
    setSaving(true); setError(""); setMessage("");
    try {
      const response = await fetch("/api/activity-evidence", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ activityId, complete, evidence: { kind: "written-response", responses } }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Không lưu được bài làm.");
      setMessage(complete ? "Đã nộp bài cho giáo viên." : "Đã lưu tiến độ lên hệ thống.");
      if (complete) setReadOnly(true);
    } catch (saveError) { setError(saveError instanceof Error ? saveError.message : "Không lưu được bài làm."); }
    finally { setSaving(false); }
  };

  return <section className="mt-5 space-y-4 rounded-2xl border border-blue-100 bg-blue-50/50 p-4 md:p-5" aria-label={definition.title}>
    <div className="flex flex-wrap items-center justify-between gap-2"><div><h3 className="font-extrabold text-slate-900">{definition.title}</h3><p className="mt-1 text-xs text-slate-600">Có thể lưu nháp, chỉnh sửa và quay lại; bài sẽ khóa sau khi nộp.</p></div><span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-slate-600">{readOnly ? "Đã nộp" : previewMode ? "Xem thử" : "Đã trả lời " + definition.fields.filter(({key}) => (responses[key] || "").trim()).length + "/" + definition.fields.length}</span></div>
    {previewMode && <p className="rounded-xl bg-amber-50 p-3 text-xs text-amber-900">Bản xem tự do: biểu mẫu chỉ để xem, cần tài khoản học sinh để lưu vào lớp.</p>}
    <div className="grid gap-3 md:grid-cols-2">{definition.fields.map((field) => <label key={field.key} className="text-xs font-bold text-slate-700">{field.label}<span className="mt-1 block font-normal leading-5 text-slate-600">{field.prompt}</span><textarea value={responses[field.key] || ""} disabled={readOnly} maxLength={4000} onChange={(event) => setResponses((current) => ({ ...current, [field.key]: event.target.value }))} className="mt-2 min-h-24 w-full rounded-xl border border-slate-200 bg-white p-3 text-sm font-normal leading-6 outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100" placeholder="Nhập câu trả lời của em…"/></label>)}</div>
    {error && <p role="alert" className="rounded-xl bg-rose-50 p-3 text-xs text-rose-800">{error}</p>}{message && <p role="status" className="rounded-xl bg-emerald-50 p-3 text-xs text-emerald-800">{message}</p>}
    <div className="flex flex-wrap items-center justify-between gap-2 border-t border-blue-100 pt-3"><p className="text-xs text-slate-500">{loading ? "Đang tải bài đã lưu…" : readOnly ? "Giáo viên có thể xem trong mục Sổ tay & bằng chứng." : "Câu trả lời được lưu theo tài khoản học sinh."}</p><div className="flex gap-2"><button type="button" disabled={loading || saving || readOnly || previewMode} onClick={() => void save(false)} className="inline-flex items-center gap-2 rounded-xl border border-blue-200 bg-white px-3 py-2 text-xs font-bold text-blue-800 disabled:opacity-50">{saving?<Loader2 className="h-4 w-4 animate-spin"/>:<Save className="h-4 w-4"/>}Lưu nháp</button><button type="button" disabled={loading || saving || readOnly || previewMode || !isComplete} onClick={() => void save(true)} className="inline-flex items-center gap-2 rounded-xl bg-blue-700 px-3 py-2 text-xs font-bold text-white disabled:opacity-50">{saving?<Loader2 className="h-4 w-4 animate-spin"/>:<CheckCircle2 className="h-4 w-4"/>}Nộp cho giáo viên</button></div></div>
  </section>;
}
