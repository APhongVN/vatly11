"use client";

import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, ExternalLink, FileVideo2, LoaderCircle, Save } from "lucide-react";
import { supabase } from "@/lib/supabase";

type Resource = { id: string; title: string; description: string; resource_type: "file" | "link"; source_url: string | null; storage_path: string | null; mime_type: string | null; category: string; display_order: number };
type Question = { id: string; prompt: string };
type VideoSlot = { id: string; title: string; duration: string; intro: string; questions: Question[] };
type Evidence = { kind: "microteaching"; watched: Record<string, boolean>; answers: Record<string, string> };

const VIDEOS: VideoSlot[] = [
  { id: "v1", title: "Tụ điện trong đời sống và kĩ thuật", duration: "4–5 phút", intro: "Nhận diện ứng dụng lưu trữ và giải phóng năng lượng; phân biệt tụ với dây dẫn.", questions: [
    { id: "v1_q1", prompt: "Ví dụ nào phù hợp nhất với việc tích trữ rồi giải phóng năng lượng nhanh?" },
    { id: "v1_q2", prompt: "Điểm khác biệt quan trọng giữa tụ điện và đoạn dây dẫn đơn thuần là gì?" },
    { id: "v1_q3", prompt: "Em dùng đại lượng nào để mô tả khả năng tích điện của một tụ? Vì sao?" },
  ] },
  { id: "v2", title: "Cấu tạo, tích điện và phóng điện", duration: "5–6 phút", intro: "Theo dõi ba trạng thái: nạp từ nguồn, giữ điện tích khi ngắt, và truyền năng lượng sang tải.", questions: [
    { id: "v2_q1", prompt: "Tụ điện cơ bản gồm những thành phần nào?" },
    { id: "v2_q2", prompt: "Điện tích trên hai bản khi tụ được nạp có dấu và độ lớn thế nào?" },
    { id: "v2_q3", prompt: "Sau khi ngắt nguồn, đại lượng nào không biến mất ngay trong mô hình lí tưởng?" },
    { id: "v2_q4", prompt: "Vì sao đèn chỉ sáng trong một khoảng thời gian khi nối với tụ đã nạp?" },
    { id: "v2_q5", prompt: "Sắp xếp đúng trình tự nạp, ngắt nguồn, nối tải và phóng điện; giải thích ngắn." },
  ] },
  { id: "v3", title: "Điện dung và quan hệ Q–U", duration: "5–6 phút", intro: "Giữ nguyên cấu tạo tụ, khảo sát quan hệ giữa điện tích Q và hiệu điện thế U.", questions: [
    { id: "v3_q1", prompt: "Khi khảo sát ảnh hưởng của U lên Q, những yếu tố nào phải giữ không đổi?" },
    { id: "v3_q2", prompt: "Với cùng một tụ, khi U tăng thì Q có xu hướng thay đổi ra sao?" },
    { id: "v3_q3", prompt: "Em dự đoán đồ thị Q=f(U) có dạng nào? Nêu cơ sở." },
    { id: "v3_q4", prompt: "Nếu Q=f(U) là đường thẳng qua gốc, hệ số góc biểu thị đại lượng nào?" },
    { id: "v3_q5", prompt: "Đơn vị SI của điện dung là gì? Kể một đơn vị thường dùng khác." },
  ] },
  { id: "v4", title: "Yếu tố ảnh hưởng, ghép tụ và năng lượng", duration: "5–6 phút", intro: "Kết nối hình học, điện môi, cách ghép, giới hạn điện áp và năng lượng theo đồ thị U(Q).", questions: [
    { id: "v4_q1", prompt: "Yếu tố nào có thể làm thay đổi điện dung của tụ phẳng lí tưởng?" },
    { id: "v4_q2", prompt: "Ghép tụ có thể giúp đáp ứng những yêu cầu nào của mạch?" },
    { id: "v4_q3", prompt: "Diện tích dưới đồ thị U=f(Q) liên quan đến đại lượng vật lí nào?" },
    { id: "v4_q4", prompt: "Trên tụ ghi 100 μF – 25 V, cần hiểu và dùng giới hạn 25 V thế nào?" },
    { id: "v4_q5", prompt: "Nêu một ứng dụng của tụ và mô tả đúng vai trò của nó trong ứng dụng đó." },
  ] },
];

function videoEmbed(url: string) {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.toLowerCase().replace(/^www\./, "");
    if (host === "youtu.be") return `https://www.youtube-nocookie.com/embed/${parsed.pathname.slice(1)}`;
    if (host === "youtube.com" || host === "m.youtube.com") {
      const id = parsed.searchParams.get("v") || parsed.pathname.match(/\/embed\/([^/]+)/)?.[1];
      if (id && /^[\w-]{6,20}$/.test(id)) return `https://www.youtube-nocookie.com/embed/${id}`;
    }
    if (host === "vimeo.com" || host === "player.vimeo.com") {
      const id = parsed.pathname.split("/").filter(Boolean).pop();
      if (id && /^\d+$/.test(id)) return `https://player.vimeo.com/video/${id}`;
    }
  } catch { /* Invalid or non-embed links remain available as normal links. */ }
  return null;
}

export default function ActivityMicroteaching() {
  const [resources, setResources] = useState<Resource[]>([]);
  const [fileUrls, setFileUrls] = useState<Record<string, string>>({});
  const [watched, setWatched] = useState<Record<string, boolean>>({});
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [preview, setPreview] = useState(false);
  const [readOnly, setReadOnly] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    let active = true;
    const load = async () => {
      const [resourceResult, evidenceResult] = await Promise.all([
        supabase.from("learning_resources").select("id,title,description,resource_type,source_url,storage_path,mime_type,category,display_order").eq("activity_id", 2).eq("is_published", true).order("display_order", { ascending: true }),
        fetch("/api/activity-evidence?activityId=2", { cache: "no-store" }),
      ]);
      if (!active) return;
      if (!resourceResult.error && resourceResult.data) {
        const videoResources = (resourceResult.data as Resource[]).filter((item) => item.category === "Video" || item.mime_type?.startsWith("video/"));
        setResources(videoResources);
        const urls = await Promise.all(videoResources.filter((item) => item.storage_path).map(async (item) => {
          const { data } = await supabase.storage.from("learning-resources").createSignedUrl(item.storage_path!, 3600);
          return [item.id, data?.signedUrl || ""] as const;
        }));
        if (active) setFileUrls(Object.fromEntries(urls.filter(([, url]) => url)));
      }
      try {
        if (evidenceResult.status === 401) setPreview(true);
        else if (evidenceResult.ok) {
          const payload = await evidenceResult.json();
          const evidence = payload.record?.evidence as Evidence | undefined;
          if (evidence?.kind === "microteaching") {
            setWatched(evidence.watched || {});
            setAnswers(evidence.answers || {});
            setReadOnly(Boolean(payload.record?.completed_at));
          }
        } else {
          const payload = await evidenceResult.json().catch(() => ({}));
          setError(payload.error || "Không tải được tiến độ video.");
        }
      } catch { setError("Không tải được tiến độ video."); }
      finally { if (active) setLoading(false); }
    };
    void load();
    return () => { active = false; };
  }, []);

  const resourcesBySlot = useMemo(() => VIDEOS.map((slot, index) => {
    const explicit = resources.find((item) => new RegExp(`(?:video|v)\\s*0?${index + 1}`, "i").test(item.title));
    return explicit || resources[index] || null;
  }), [resources]);
  const answeredCount = Object.values(answers).filter((value) => value.trim().length >= 3).length;
  const canComplete = VIDEOS.every(({ id, questions }) => watched[id] && questions.every(({ id: questionId }) => (answers[questionId] || "").trim().length >= 3));

  const save = async (complete: boolean) => {
    if (preview) { setNotice("Bản xem trước chỉ để xem nội dung; tiến độ được lưu sau khi có tài khoản học sinh."); return; }
    if (readOnly) return;
    if (complete && !canComplete) { setError("Hãy xem đủ bốn video và trả lời các checkpoint trước khi nộp."); return; }
    setSaving(true); setError(""); setNotice("");
    try {
      const response = await fetch("/api/activity-evidence", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ activityId: 2, complete, evidence: { kind: "microteaching", watched, answers } }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Không lưu được tiến độ.");
      setNotice(complete ? "Đã nộp checkpoint cho giáo viên." : "Đã lưu tiến độ video.");
      if (complete) setReadOnly(true);
    } catch (saveError) { setError(saveError instanceof Error ? saveError.message : "Không lưu được tiến độ."); }
    finally { setSaving(false); }
  };

  return <section className="space-y-5 rounded-3xl border border-blue-100 bg-gradient-to-br from-blue-50 to-white p-5 md:p-7">
    <header><p className="text-xs font-extrabold uppercase tracking-widest text-blue-700">PRE02 · 20–25 phút</p><h2 className="mt-1 text-xl font-extrabold text-slate-950">Microteaching · 4 video có checkpoint</h2><p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">Giáo viên thêm video vào Kho học liệu, chọn hoạt động 2 và danh mục “Video”. Đặt tên “Video 1” đến “Video 4” để tự ghép đúng nội dung. Bài chỉ khóa sau khi nộp checkpoint.</p></header>
    {preview && <p className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">Chế độ xem tự do: em có thể xem video và câu hỏi; lưu/nộp cần tài khoản học sinh đã được mở.</p>}
    {error && <p role="alert" className="rounded-xl bg-rose-50 p-3 text-sm text-rose-800">{error}</p>}
    {notice && <p role="status" className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">{notice}</p>}
    {resources.length === 0 && <div className="rounded-2xl border border-dashed border-blue-200 bg-white p-4 text-sm text-slate-600"><FileVideo2 className="mb-2 h-5 w-5 text-blue-700" />Chưa có video được giáo viên xuất bản cho hoạt động này. Bốn khung nội dung và checkpoint vẫn hiển thị bên dưới.</div>}
    <div className="space-y-4">{VIDEOS.map((slot, index) => {
      const resource = resourcesBySlot[index];
      const source = resource?.source_url || (resource?.storage_path ? fileUrls[resource.id] : "") || "";
      const embed = resource?.resource_type === "link" && source ? videoEmbed(source) : null;
      const isDirectVideo = Boolean(resource?.mime_type?.startsWith("video/") || /\.(mp4|webm)(?:$|\?)/i.test(source));
      return <article key={slot.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 p-4"><div><p className="text-[10px] font-extrabold uppercase tracking-widest text-blue-700">VIDEO {index + 1} · {slot.duration}</p><h3 className="mt-1 font-bold text-slate-900">{slot.title}</h3><p className="mt-1 text-xs leading-5 text-slate-500">{slot.intro}</p></div><span className={`rounded-full px-3 py-1 text-xs font-bold ${watched[slot.id] ? "bg-emerald-50 text-emerald-800" : "bg-slate-100 text-slate-600"}`}>{watched[slot.id] ? "Đã xem" : "Chưa hoàn thành"}</span></div>
        {resource && source && (embed ? <iframe title={slot.title} src={embed} className="aspect-video w-full bg-slate-950" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerPolicy="strict-origin-when-cross-origin" allowFullScreen /> : isDirectVideo ? <video key={source} src={source} controls preload="metadata" className="aspect-video w-full bg-slate-950" onEnded={() => setWatched((current) => ({ ...current, [slot.id]: true }))} /> : <div className="p-4"><a href={source} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-xl bg-blue-700 px-4 py-2 text-xs font-bold text-white"><ExternalLink className="h-4 w-4"/>Mở video: {resource.title}</a></div>)}
        {!resource && <div className="grid aspect-video place-items-center bg-slate-950 px-6 text-center text-sm text-slate-300">Chưa gắn video này trong Kho học liệu</div>}
        {resource && !isDirectVideo && <label className="mx-4 mt-3 flex cursor-pointer items-start gap-2 rounded-xl bg-blue-50 p-3 text-xs leading-5 text-blue-950"><input className="mt-0.5" type="checkbox" disabled={readOnly} checked={Boolean(watched[slot.id])} onChange={(event) => setWatched((current) => ({ ...current, [slot.id]: event.target.checked }))}/><span>Em đã xem hết video này. Với đường dẫn nhúng bên ngoài, hệ thống ghi nhận xác nhận của em.</span></label>}
        <div className="grid gap-3 p-4 md:grid-cols-2">{slot.questions.map((question, questionIndex) => <label key={question.id} className="text-xs font-bold text-slate-700">{slot.id.toUpperCase()}-Q{questionIndex + 1}<span className="mt-1 block font-normal leading-5 text-slate-600">{question.prompt}</span><textarea value={answers[question.id] || ""} disabled={readOnly} maxLength={2000} onChange={(event) => setAnswers((current) => ({ ...current, [question.id]: event.target.value }))} className="mt-2 min-h-20 w-full rounded-xl border border-slate-200 p-3 text-sm font-normal outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100" placeholder="Ghi câu trả lời ngắn của em…"/></label>)}</div>
      </article>;
    })}</div>
    <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-blue-100 pt-4"><p className="text-xs text-slate-500">{loading ? "Đang tải dữ liệu…" : `${Object.values(watched).filter(Boolean).length}/4 video · ${answeredCount}/18 checkpoint`}{readOnly ? " · Đã nộp, chờ giáo viên xem" : " · Bằng chứng được lưu theo tài khoản học sinh"}</p><div className="flex gap-2"><button type="button" onClick={() => void save(false)} disabled={loading || saving || readOnly || preview} className="inline-flex items-center gap-2 rounded-xl border border-blue-200 bg-white px-3 py-2 text-xs font-bold text-blue-800 disabled:opacity-50">{saving ? <LoaderCircle className="h-4 w-4 animate-spin"/> : <Save className="h-4 w-4"/>}Lưu nháp</button><button type="button" onClick={() => void save(true)} disabled={loading || saving || readOnly || preview || !canComplete} className="inline-flex items-center gap-2 rounded-xl bg-blue-700 px-3 py-2 text-xs font-bold text-white disabled:opacity-50">{saving ? <LoaderCircle className="h-4 w-4 animate-spin"/> : <CheckCircle2 className="h-4 w-4"/>}Nộp checkpoint</button></div></footer>
  </section>;
}
