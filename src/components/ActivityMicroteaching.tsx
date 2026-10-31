"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { CheckCircle2, ExternalLink, FileVideo2, LoaderCircle, Save, Subtitles } from "lucide-react";
import { supabase } from "@/lib/supabase";
import StudentActivityResult from "@/components/StudentActivityResult";
import {
  canSeekToWatchedTime,
  contiguousWatchedEnd,
  isTimelineComplete,
  MICROTEACHING_MINIMUM_DURATION_SECONDS,
  normalizePlayedRanges,
  rangesFromTimeRanges,
} from "@/lib/microteaching-progress.mjs";

type WatchRange = [number, number];
type Resource = { id: string; title: string; description: string; resource_type: "file" | "link"; source_url: string | null; storage_path: string | null; mime_type: string | null; category: string; display_order: number };
type Question = { id: string; prompt: string; at: number };
type TranscriptSegment = { start: string; end: string; text: string };
type VideoSlot = { id: string; title: string; duration: string; intro: string; captionPath: string; transcript: TranscriptSegment[]; questions: Question[] };
type Evidence = { kind: "microteaching"; watched?: Record<string, boolean>; watchRanges?: Record<string, WatchRange[]>; videoDurations?: Record<string, number>; passedCheckpoints?: Record<string, boolean>; answers?: Record<string, string> };
type ActiveCheckpoint = { videoId: string; question: Question };

const VIDEOS: VideoSlot[] = [
  { id: "v1", title: "Tụ điện trong đời sống và kĩ thuật", duration: "4–5 phút", intro: "Nhận diện ứng dụng lưu trữ và giải phóng năng lượng; phân biệt tụ với dây dẫn.", captionPath: "/captions/tu-dien-v1.vi.vtt", transcript: [
    { start: "0:00", end: "0:40", text: "Tụ điện xuất hiện trong nhiều mạch điện. Hình dạng khác nhau nhưng chúng đều có thể tích trữ điện tích và năng lượng điện trường trong một giới hạn nhất định." },
    { start: "0:40", end: "1:35", text: "Trong một số ứng dụng, tụ được nạp từ nguồn rồi giải phóng năng lượng trong thời gian ngắn. Đèn flash phóng điện của máy ảnh là một ví dụ điển hình." },
    { start: "1:35", end: "2:40", text: "Một dây dẫn chỉ tạo đường dẫn dòng điện; tụ điện còn tích điện trên hai bản dẫn cách nhau bởi điện môi." },
    { start: "2:40", end: "4:20", text: "Tụ được cấu tạo như thế nào? Điều gì quyết định khả năng tích điện? Năng lượng của tụ được xác định ra sao?" },
  ], questions: [
    { id: "v1_q1", at: 40, prompt: "Ví dụ nào phù hợp nhất với việc tích trữ rồi giải phóng năng lượng nhanh?" },
    { id: "v1_q2", at: 95, prompt: "Điểm khác biệt quan trọng giữa tụ điện và đoạn dây dẫn đơn thuần là gì?" },
    { id: "v1_q3", at: 160, prompt: "Em dùng đại lượng nào để mô tả khả năng tích điện của một tụ? Vì sao?" },
  ] },
  { id: "v2", title: "Cấu tạo, tích điện và phóng điện", duration: "5–6 phút", intro: "Theo dõi ba trạng thái: nạp từ nguồn, giữ điện tích khi ngắt, và truyền năng lượng sang tải.", captionPath: "/captions/tu-dien-v2.vi.vtt", transcript: [
    { start: "0:00", end: "1:10", text: "Mô hình đơn giản nhất của tụ điện gồm hai vật dẫn đặt gần nhau và ngăn cách bởi môi trường cách điện, gọi là điện môi. Mỗi vật dẫn là một bản tụ." },
    { start: "1:10", end: "2:20", text: "Khi nối với nguồn, điện tích phân bố trên hai bản: một bản mang điện dương, bản kia mang điện âm; độ lớn điện tích trên hai bản bằng nhau." },
    { start: "2:20", end: "3:20", text: "Sau khi ngắt khỏi nguồn và nếu bỏ qua rò điện, tụ vẫn có thể giữ điện tích trong một khoảng thời gian." },
    { start: "3:20", end: "4:30", text: "Khi tạo mạch ngoài, tụ phóng điện. Năng lượng dự trữ được truyền sang tải." },
    { start: "4:30", end: "5:30", text: "Ba trạng thái nạp, giữ điện tích và phóng điện là nền tảng để hiểu các ứng dụng của tụ điện." },
  ], questions: [
    { id: "v2_q1", at: 70, prompt: "Tụ điện cơ bản gồm những thành phần nào?" },
    { id: "v2_q2", at: 140, prompt: "Điện tích trên hai bản khi tụ được nạp có dấu và độ lớn thế nào?" },
    { id: "v2_q3", at: 200, prompt: "Sau khi ngắt nguồn, đại lượng nào không biến mất ngay trong mô hình lí tưởng?" },
    { id: "v2_q4", at: 270, prompt: "Vì sao đèn chỉ sáng trong một khoảng thời gian khi nối với tụ đã nạp?" },
    { id: "v2_q5", at: 330, prompt: "Sắp xếp đúng trình tự nạp, ngắt nguồn, nối tải và phóng điện; giải thích ngắn." },
  ] },
  { id: "v3", title: "Điện dung và quan hệ Q–U", duration: "5–6 phút", intro: "Giữ nguyên cấu tạo tụ, khảo sát quan hệ giữa điện tích Q và hiệu điện thế U.", captionPath: "/captions/tu-dien-v3.vi.vtt", transcript: [
    { start: "0:00", end: "0:55", text: "Ta giữ nguyên cấu tạo của tụ và chỉ thay đổi hiệu điện thế giữa hai bản." },
    { start: "0:55", end: "2:10", text: "Khi U tăng, độ lớn điện tích Q mà tụ tích được cũng tăng. Điều quan trọng là tìm quy luật giữa hai đại lượng." },
    { start: "2:10", end: "3:20", text: "Em hãy dự đoán dạng đồ thị Q theo U. Kết quả sẽ được kiểm chứng trong phòng thí nghiệm ảo." },
    { start: "3:20", end: "4:40", text: "Tỉ số Q/U đối với cùng một tụ là đại lượng đặc trưng cho khả năng tích điện của tụ, gọi là điện dung." },
    { start: "4:40", end: "5:30", text: "Điện dung có đơn vị fara (F). Trong thực tế thường dùng microfara, nanofara và picofara." },
  ], questions: [
    { id: "v3_q1", at: 55, prompt: "Khi khảo sát ảnh hưởng của U lên Q, những yếu tố nào phải giữ không đổi?" },
    { id: "v3_q2", at: 130, prompt: "Với cùng một tụ, khi U tăng thì Q có xu hướng thay đổi ra sao?" },
    { id: "v3_q3", at: 200, prompt: "Em dự đoán đồ thị Q=f(U) có dạng nào? Nêu cơ sở." },
    { id: "v3_q4", at: 280, prompt: "Nếu Q=f(U) là đường thẳng qua gốc, hệ số góc biểu thị đại lượng nào?" },
    { id: "v3_q5", at: 340, prompt: "Đơn vị SI của điện dung là gì? Kể một đơn vị thường dùng khác." },
  ] },
  { id: "v4", title: "Yếu tố ảnh hưởng, ghép tụ và năng lượng", duration: "5–6 phút", intro: "Kết nối hình học, điện môi, cách ghép, giới hạn điện áp và năng lượng theo đồ thị U(Q).", captionPath: "/captions/tu-dien-v4.vi.vtt", transcript: [
    { start: "0:00", end: "1:10", text: "Điện dung không do U quyết định đối với một tụ lí tưởng cố định; nó phụ thuộc hình học và môi trường điện môi." },
    { start: "1:10", end: "2:20", text: "Khi cần điện dung tương đương hoặc giới hạn điện áp khác, nhiều tụ có thể được ghép thành bộ." },
    { start: "2:20", end: "3:40", text: "Quá trình nạp tụ đòi hỏi công. Năng lượng tích trữ liên quan đến diện tích dưới đường U theo Q." },
    { start: "3:40", end: "4:50", text: "Không chỉ cần biết điện dung; phải tôn trọng điện áp làm việc cho phép của tụ." },
    { start: "4:50", end: "5:40", text: "Các chức năng của tụ thay đổi theo mạch. Không nên đồng nhất mọi ứng dụng với việc phóng điện nhanh." },
  ], questions: [
    { id: "v4_q1", at: 70, prompt: "Yếu tố nào có thể làm thay đổi điện dung của tụ phẳng lí tưởng?" },
    { id: "v4_q2", at: 140, prompt: "Ghép tụ có thể giúp đáp ứng những yêu cầu nào của mạch?" },
    { id: "v4_q3", at: 220, prompt: "Diện tích dưới đồ thị U=f(Q) liên quan đến đại lượng vật lí nào?" },
    { id: "v4_q4", at: 290, prompt: "Trên tụ ghi 100 μF – 25 V, cần hiểu và dùng giới hạn 25 V thế nào?" },
    { id: "v4_q5", at: 340, prompt: "Nêu một ứng dụng của tụ và mô tả đúng vai trò của nó trong ứng dụng đó." },
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
  } catch { /* Invalid links remain available as normal resources. */ }
  return null;
}

function isTrackableVideo(resource: Resource | null, source: string) {
  return Boolean(resource && source && (resource.mime_type?.startsWith("video/") || /\.(mp4|webm|ogg)(?:$|\?)/i.test(source)));
}

export default function ActivityMicroteaching() {
  const [resources, setResources] = useState<Resource[]>([]);
  const [fileUrls, setFileUrls] = useState<Record<string, string>>({});
  const [savedWatched, setSavedWatched] = useState<Record<string, boolean>>({});
  const [watchRanges, setWatchRanges] = useState<Record<string, WatchRange[]>>({});
  const [videoDurations, setVideoDurations] = useState<Record<string, number>>({});
  const [passedCheckpoints, setPassedCheckpoints] = useState<Record<string, boolean>>({});
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [activeCheckpoint, setActiveCheckpoint] = useState<ActiveCheckpoint | null>(null);
  const videoRefs = useRef<Record<string, HTMLVideoElement | null>>({});
  const [preview, setPreview] = useState(false);
  const [readOnly, setReadOnly] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [teacherReview, setTeacherReview] = useState<{ score: number; feedback: string | null; gradedAt: string | null } | null>(null);

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
          if (typeof payload.record?.teacher_score === "number") setTeacherReview({ score: payload.record.teacher_score, feedback: payload.record.teacher_feedback || null, gradedAt: payload.record.graded_at || null });
          if (evidence?.kind === "microteaching") {
            setSavedWatched(evidence.watched || {});
            setWatchRanges(evidence.watchRanges || {});
            setVideoDurations(evidence.videoDurations || {});
            setPassedCheckpoints(evidence.passedCheckpoints || {});
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

  const timelineComplete = Object.fromEntries(VIDEOS.map((slot) => [
    slot.id,
    isTimelineComplete(watchRanges[slot.id] || [], videoDurations[slot.id], MICROTEACHING_MINIMUM_DURATION_SECONDS[slot.id as keyof typeof MICROTEACHING_MINIMUM_DURATION_SECONDS]),
  ]));
  const watched = Object.fromEntries(VIDEOS.map((slot) => [slot.id, timelineComplete[slot.id] || savedWatched[slot.id] || false]));
  const questions = VIDEOS.flatMap((video) => video.questions);
  const answeredCount = questions.filter(({ id }) => (answers[id] || "").trim().length >= 3).length;
  const canComplete = VIDEOS.every((video) => timelineComplete[video.id]
    && video.questions.every(({ id }) => passedCheckpoints[id] && (answers[id] || "").trim().length >= 3));

  const recordPlayback = (slot: VideoSlot, video: HTMLVideoElement) => {
    const ranges = rangesFromTimeRanges(video.played) as WatchRange[];
    const duration = Number.isFinite(video.duration) ? video.duration : 0;
    if (duration > 0) setVideoDurations((current) => current[slot.id] === duration ? current : { ...current, [slot.id]: duration });
    setWatchRanges((current) => {
      const old = current[slot.id] || [];
      const merged = normalizePlayedRanges([...old, ...ranges]) as WatchRange[];
      if (JSON.stringify(old) === JSON.stringify(merged)) return current;
      return { ...current, [slot.id]: merged };
    });
  };

  const handleVideoTimeUpdate = (slot: VideoSlot, video: HTMLVideoElement) => {
    recordPlayback(slot, video);
    if (readOnly || activeCheckpoint?.videoId === slot.id) return;
    const checkpoint = slot.questions.find((question) => !passedCheckpoints[question.id] && video.currentTime >= question.at);
    if (checkpoint) {
      video.pause();
      setActiveCheckpoint({ videoId: slot.id, question: checkpoint });
    }
  };

  const handleSeeking = (slot: VideoSlot, video: HTMLVideoElement) => {
    if (readOnly) return;
    const ranges = normalizePlayedRanges([
      ...(watchRanges[slot.id] || []),
      ...(rangesFromTimeRanges(video.played) as WatchRange[]),
    ]);
    const nextCheckpoint = slot.questions.find((question) => !passedCheckpoints[question.id]);
    const checkpointLimit = nextCheckpoint?.at ?? video.duration;
    const target = video.currentTime;
    if (!canSeekToWatchedTime(ranges, target) || (Number.isFinite(checkpointLimit) && target > checkpointLimit + 0.25)) {
      const resumeAt = Math.min(contiguousWatchedEnd(ranges), Number.isFinite(checkpointLimit) ? checkpointLimit : 0);
      video.pause();
      video.currentTime = resumeAt;
      setError("Em cần xem tuần tự đến mốc này trước khi tua tiếp.");
    }
  };

  const continueAfterCheckpoint = (slotId: string, question: Question) => {
    if ((answers[question.id] || "").trim().length < 3) return;
    setPassedCheckpoints((current) => ({ ...current, [question.id]: true }));
    setActiveCheckpoint(null);
    setError("");
    videoRefs.current[slotId]?.play().catch(() => setNotice("Bấm phát video để tiếp tục."));
  };

  const save = async (complete: boolean) => {
    if (preview) { setNotice("Bản xem trước chỉ để xem nội dung; tiến độ được lưu sau khi có tài khoản học sinh."); return; }
    if (readOnly) return;
    if (complete && !canComplete) { setError("Hãy xem đủ timeline, trả lời checkpoint tại từng mốc rồi mới nộp."); return; }
    setSaving(true); setError(""); setNotice("");
    try {
      const verifiedWatched = Object.fromEntries(VIDEOS.map((slot) => [slot.id, Boolean(timelineComplete[slot.id])]));
      const response = await fetch("/api/activity-evidence", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ activityId: 2, complete, evidence: { kind: "microteaching", watched: verifiedWatched, watchRanges, videoDurations, passedCheckpoints, answers } }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Không lưu được tiến độ.");
      setSavedWatched(verifiedWatched);
      setNotice(complete ? "Đã nộp checkpoint cho giáo viên." : "Đã lưu tiến độ xem và câu trả lời.");
      if (complete) setReadOnly(true);
    } catch (saveError) { setError(saveError instanceof Error ? saveError.message : "Không lưu được tiến độ."); }
    finally { setSaving(false); }
  };

  return <section className="space-y-5 rounded-3xl border border-blue-100 bg-gradient-to-br from-blue-50 to-white p-5 md:p-7">
    <header><p className="text-xs font-extrabold uppercase tracking-widest text-blue-700">PRE02 · 20–25 phút</p><h2 className="mt-1 text-xl font-extrabold text-slate-950">Microteaching · 4 video có checkpoint</h2><p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">Bốn kịch bản, transcript và phụ đề được biên soạn từ tài liệu của cô. Để hệ thống ghi nhận đủ timeline, giáo viên cần tải video lên Kho học liệu và đặt tên “Video 1” đến “Video 4”. Video nhúng ngoài vẫn xem được nhưng không thể xác minh thời lượng đã xem.</p></header>
    {preview && <p className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">Chế độ xem tự do: em có thể đọc transcript và xem nội dung; lưu/nộp cần tài khoản học sinh đã được mở.</p>}
    {teacherReview && <StudentActivityResult score={teacherReview.score} feedback={teacherReview.feedback} gradedAt={teacherReview.gradedAt}/>}
    {error && <p role="alert" className="rounded-xl bg-rose-50 p-3 text-sm text-rose-800">{error}</p>}
    {notice && <p role="status" className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">{notice}</p>}
    {resources.length === 0 && <div className="rounded-2xl border border-dashed border-blue-200 bg-white p-4 text-sm text-slate-600"><FileVideo2 className="mb-2 h-5 w-5 text-blue-700" />Chưa có video được giáo viên xuất bản cho hoạt động này. Transcript, phụ đề và checkpoint vẫn hiển thị; chưa thể nộp hoàn thành nếu chưa có video.</div>}
    <div className="space-y-4">{VIDEOS.map((slot, index) => {
      const resource = resourcesBySlot[index];
      const source = resource?.source_url || (resource?.storage_path ? fileUrls[resource.id] : "") || "";
      const embed = resource?.resource_type === "link" && source ? videoEmbed(source) : null;
      const directVideo = isTrackableVideo(resource, source);
      const coverage = normalizePlayedRanges(watchRanges[slot.id] || []) as WatchRange[];
      const coveredSeconds = coverage.reduce((total, [start, end]) => total + end - start, 0);
      const duration = videoDurations[slot.id] || 0;
      const active = activeCheckpoint?.videoId === slot.id ? activeCheckpoint.question : null;
      return <article key={slot.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 p-4"><div><p className="text-[10px] font-extrabold uppercase tracking-widest text-blue-700">VIDEO {index + 1} · {slot.duration}</p><h3 className="mt-1 font-bold text-slate-900">{slot.title}</h3><p className="mt-1 text-xs leading-5 text-slate-500">{slot.intro}</p></div><span className={`rounded-full px-3 py-1 text-xs font-bold ${watched[slot.id] ? "bg-emerald-50 text-emerald-800" : "bg-slate-100 text-slate-600"}`}>{watched[slot.id] ? "Đã xem đủ timeline" : "Chưa xem đủ"}</span></div>
        {resource && source ? (embed ? <iframe title={slot.title} src={embed} className="aspect-video w-full bg-slate-950" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerPolicy="strict-origin-when-cross-origin" allowFullScreen /> : directVideo ? <div className="relative bg-slate-950"><video ref={(node) => { videoRefs.current[slot.id] = node; }} key={source} src={source} controls preload="metadata" controlsList="nodownload noplaybackrate" className="aspect-video w-full" onLoadedMetadata={(event) => recordPlayback(slot, event.currentTarget)} onTimeUpdate={(event) => handleVideoTimeUpdate(slot, event.currentTarget)} onSeeking={(event) => handleSeeking(slot, event.currentTarget)} onRateChange={(event) => { if (event.currentTarget.playbackRate !== 1) event.currentTarget.playbackRate = 1; }} onEnded={(event) => recordPlayback(slot, event.currentTarget)} onError={() => setError(`Không phát được ${resource.title}. Hãy kiểm tra lại tệp video trong Kho học liệu.`)}><track kind="captions" srcLang="vi" label="Tiếng Việt" src={slot.captionPath} default /></video>{active && <div role="dialog" aria-modal="true" aria-labelledby={`${active.id}-title`} className="absolute inset-0 grid place-items-center bg-slate-950/85 p-4"><div className="w-full max-w-lg rounded-2xl bg-white p-5 shadow-2xl"><p className="text-xs font-extrabold uppercase tracking-wider text-blue-700">Checkpoint · {Math.floor(active.at / 60)}:{String(active.at % 60).padStart(2, "0")}</p><h4 id={`${active.id}-title`} className="mt-2 text-base font-bold text-slate-900">{active.prompt}</h4><textarea autoFocus maxLength={2000} value={answers[active.id] || ""} onChange={(event) => setAnswers((current) => ({ ...current, [active.id]: event.target.value }))} className="mt-3 min-h-24 w-full rounded-xl border border-slate-300 p-3 text-sm outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100" placeholder="Ghi câu trả lời ngắn; không cần đoán đúng mới được tiếp tục." /><button type="button" onClick={() => continueAfterCheckpoint(slot.id, active)} disabled={(answers[active.id] || "").trim().length < 3} className="mt-3 w-full rounded-xl bg-blue-700 px-4 py-2.5 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-50">Lưu câu trả lời và tiếp tục</button><p className="mt-2 text-[11px] text-slate-500">Cần ghi câu trả lời để tiếp tục, nhưng không bắt buộc trả lời đúng.</p></div></div>}</div> : <div className="p-4"><a href={source} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-xl bg-blue-700 px-4 py-2 text-xs font-bold text-white"><ExternalLink className="h-4 w-4"/>{embed ? "Mở video bên ngoài" : `Mở video: ${resource.title}`}</a></div>) : <div className="grid aspect-video place-items-center bg-slate-950 px-6 text-center text-sm text-slate-300">Chưa gắn video này trong Kho học liệu</div>}
        {resource && source && !directVideo && <p className="mx-4 mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-950">Video nhúng/đường dẫn ngoài không cung cấp dữ liệu phát tin cậy cho website. Em có thể xem và đọc phụ đề bên dưới, nhưng cần video MP4/WebM do giáo viên tải lên để ghi nhận timeline và nộp checkpoint.</p>}
        {directVideo && <p className="px-4 pt-3 text-xs text-slate-500">Đã xem {Math.floor(coveredSeconds)} giây{duration ? ` / ${Math.floor(duration)} giây` : ""}. Video tạm dừng ở checkpoint; không thể tua qua đoạn chưa xem.</p>}
        <details className="mx-4 mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3"><summary className="flex cursor-pointer list-none items-center gap-2 text-xs font-bold text-slate-700"><Subtitles className="h-4 w-4 text-blue-700"/>Transcript và phụ đề tiếng Việt</summary><div className="mt-3 space-y-3">{slot.transcript.map((segment) => <p key={segment.start} className="text-xs leading-5 text-slate-700"><span className="mr-2 font-bold text-blue-800">{segment.start}–{segment.end}</span>{segment.text}</p>)}</div></details>
        <div className="space-y-2 p-4">{slot.questions.map((question) => <div key={question.id} className="flex items-start gap-2 rounded-xl bg-slate-50 p-3 text-xs"><span className={`mt-0.5 h-4 w-4 shrink-0 rounded-full ${passedCheckpoints[question.id] ? "bg-emerald-600" : "border border-slate-300"}`} aria-hidden="true"/><div className="min-w-0 flex-1"><p className="font-semibold text-slate-800">{question.prompt}</p><p className="mt-1 whitespace-pre-wrap text-slate-600">{answers[question.id] || `Checkpoint tại ${Math.floor(question.at / 60)}:${String(question.at % 60).padStart(2, "0")}`}</p></div></div>)}</div>
      </article>;
    })}</div>
    <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-blue-100 pt-4"><p className="text-xs text-slate-500">{loading ? "Đang tải dữ liệu…" : `${Object.values(watched).filter(Boolean).length}/4 video · ${answeredCount}/18 checkpoint`}{readOnly ? " · Đã nộp, chờ giáo viên xem" : " · Bằng chứng được lưu theo tài khoản học sinh"}</p><div className="flex gap-2"><button type="button" onClick={() => void save(false)} disabled={loading || saving || readOnly || preview} className="inline-flex items-center gap-2 rounded-xl border border-blue-200 bg-white px-3 py-2 text-xs font-bold text-blue-800 disabled:opacity-50">{saving ? <LoaderCircle className="h-4 w-4 animate-spin"/> : <Save className="h-4 w-4"/>}Lưu nháp</button><button type="button" onClick={() => void save(true)} disabled={loading || saving || readOnly || preview || !canComplete} className="inline-flex items-center gap-2 rounded-xl bg-blue-700 px-3 py-2 text-xs font-bold text-white disabled:opacity-50">{saving ? <LoaderCircle className="h-4 w-4 animate-spin"/> : <CheckCircle2 className="h-4 w-4"/>}Nộp checkpoint</button></div></footer>
  </section>;
}