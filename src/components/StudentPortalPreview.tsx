"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowDown, ArrowRight, BookOpen, CheckCircle2, Clock3, FlaskConical,
  GraduationCap, Microscope, RefreshCw, Search, Sparkles, Zap,
} from "lucide-react";
import { ACTIVITIES, type Activity } from "@/lib/data/activities";

type CatalogRow = Partial<Activity> & { id: number | string; phase?: string | null; status?: string | null };
type CatalogResponse = { activities?: CatalogRow[]; source?: "database" | "bundled" };
type Phase = (typeof PHASES)[number];

const PHASES = ["Tất cả", "Trước lớp", "Trên lớp", "Sau lớp"] as const;

const STUDENT_GUIDE: Record<number, { title: string; summary: string; task: string }> = {
  1: { title: "Vì sao đèn LED sáng sau khi ngắt nguồn?", summary: "Quan sát tụ được nạp, ngắt khỏi nguồn rồi mới nối LED. Hãy dự đoán hiện tượng trước khi xem kết quả.", task: "Chọn dự đoán, giải thích ngắn gọn và đặt một câu hỏi về điều bài học cần làm rõ." },
  2: { title: "4 video ngắn: từ cấu tạo đến năng lượng", summary: "Tìm hiểu ứng dụng, cấu tạo và nạp phóng, quan hệ Q–U, cách ghép tụ và năng lượng.", task: "Xem đủ 4 video, dừng ở checkpoint và ghi điều em còn chưa rõ." },
  3: { title: "Đặt 4 giả thuyết có thể kiểm chứng", summary: "Dự đoán quan hệ Q–U và ảnh hưởng của diện tích bản tụ S, khoảng cách d, điện môi εr đến C.", task: "Ghi riêng HYP-Q-U, HYP-C-S, HYP-C-D và HYP-C-EPS trước khi làm thí nghiệm." },
  4: { title: "Thử 6 mô phỏng có kiểm soát", summary: "Thay đổi S, d và εr để khảo sát điện dung; quan sát U, Q và đồ thị Q–U.", task: "Mỗi lần chỉ đổi một yếu tố, ghi số liệu vào sổ tay rồi nêu kết luận từ bằng chứng." },
  5: { title: "Đối chiếu dự đoán với thí nghiệm thật", summary: "Quan sát quá trình nạp, ngắt nguồn và tụ phóng điện làm LED sáng rồi tắt.", task: "Viết đủ ba phần Prediction – Evidence – Revision: dự đoán, bằng chứng nhìn thấy và điều em điều chỉnh." },
  6: { title: "Tự kiểm tra 10 câu trước giờ học", summary: "Ôn cấu tạo, điện tích, điện dung, ghép tụ và năng lượng qua bài kiểm tra sẵn sàng.", task: "Trả lời 10 câu, sau đó ghi một điểm em còn vướng để cô biết khi vào lớp." },
  7: { title: "Bình chọn, thảo luận cặp, rồi bình chọn lại", summary: "Trả lời 3 câu hỏi tại lớp, xem phân bố ẩn danh và thảo luận với bạn trước khi chọn lại.", task: "Lưu lựa chọn ban đầu, thảo luận ít nhất 2 phút, chọn lại và nêu lí do nếu em đổi ý." },
  8: { title: "Các thí nghiệm liên quan đến tụ điện", summary: "Một hoạt động tích hợp cấu tạo và nạp phóng; điện dung theo S, d, εr; ghép nối tiếp/song song; năng lượng qua đồ thị U–Q.", task: "Làm đủ 4 phần theo phiếu, ghi dự đoán, số liệu hoặc bằng chứng, phép tính và kết luận của nhóm." },
  12: { title: "16 câu thử thách và bài tập 4 mức", summary: "Củng cố kiến thức bằng Capacitor Challenge, sau đó chọn bài từ tính điện tích cơ bản đến thiết kế mạch ghép tụ.", task: "Làm 16 câu, rồi chọn mức phù hợp và trình bày cách giải các câu vận dụng." },
  13: { title: "Thiết kế nguồn dự phòng 12 V", summary: "Dùng catalogue tụ điện giả lập để đề xuất phương án đáp ứng thiết bị 12 V và tối thiểu 0.10 J năng lượng dự trữ hữu dụng.", task: "Nộp báo cáo, poster hoặc video; kiểm tra Umax, giải thích cách ghép và tính cơ sở năng lượng." },
  14: { title: "Tự phản tư và luyện tập giãn cách", summary: "Nhìn lại điều em đã hiểu, nhận diện quan niệm đã thay đổi và ôn tập sau buổi học.", task: "Trả lời 4 câu phản tư; quay lại làm 8 bài D1–D8 sau một tuần để kiểm tra khả năng ghi nhớ." },
};

const statusCopy: Record<Activity["status"], { label: string; style: string }> = {
  available: { label: "Có thể học", style: "border-emerald-200 bg-emerald-50 text-emerald-800" },
  locked: { label: "Chưa mở", style: "border-slate-200 bg-slate-100 text-slate-500" },
  done: { label: "Đã kết thúc", style: "border-slate-200 bg-slate-100 text-slate-500" },
};

function fromCatalogRow(row: CatalogRow, fallbackById: Map<number, Activity>): Activity | null {
  const id = Number(row.id);
  if (!Number.isInteger(id) || id <= 0) return null;
  const fallback = fallbackById.get(id);
  const validStatus = row.status === "available" || row.status === "locked" || row.status === "done";
  const validPhase = row.phase === "Trước lớp" || row.phase === "Trên lớp" || row.phase === "Sau lớp";
  const validType = row.type === "Bài giảng" || row.type === "Bài tập" || row.type === "Thí nghiệm" || row.type === "Dự án" || row.type === "Phản tư";
  return {
    id,
    code: row.code || fallback?.code || "HĐ" + String(id),
    title: row.title || fallback?.title || "Hoạt động " + String(id),
    phase: validPhase ? row.phase as Activity["phase"] : fallback?.phase || "Trên lớp",
    type: validType ? row.type as Activity["type"] : fallback?.type || "Bài tập",
    duration: row.duration || fallback?.duration || "Theo hướng dẫn giáo viên",
    status: validStatus ? row.status as Activity["status"] : fallback?.status || "available",
    description: row.description || fallback?.description || "",
    deliverable: row.deliverable || fallback?.deliverable || "",
    course_id: row.course_id || fallback?.course_id,
    chapter_id: row.chapter_id || fallback?.chapter_id,
    accepting_submissions: row.accepting_submissions ?? fallback?.accepting_submissions,
    deadline: row.deadline ?? fallback?.deadline ?? null,
    document_url: row.document_url || fallback?.document_url,
    video_url: row.video_url || fallback?.video_url,
  };
}

function mergeActivities(remoteRows: CatalogRow[]): Activity[] {
  const fallbackById = new Map(ACTIVITIES.map((activity) => [activity.id, activity]));
  const remoteById = new Map<number, CatalogRow>();
  for (const row of remoteRows) {
    const id = Number(row.id);
    if (Number.isInteger(id) && id > 0) remoteById.set(id, row);
  }
  const ids = new Set([...ACTIVITIES.map((activity) => activity.id), ...remoteById.keys()]);
  return [...ids]
    .map((id) => fromCatalogRow(remoteById.get(id) || { id }, fallbackById))
    .filter((activity): activity is Activity => activity !== null)
    .sort((left, right) => left.id - right.id);
}

function displayTitle(activity: Activity) {
  const guide = STUDENT_GUIDE[activity.id];
  const sourceTitle = ACTIVITIES.find((item) => item.id === activity.id)?.title;
  return guide && activity.title === sourceTitle ? guide.title : activity.title;
}

export default function StudentPortalPreview() {
  const [activities, setActivities] = useState<Activity[]>(ACTIVITIES);
  const [search, setSearch] = useState("");
  const [phase, setPhase] = useState<Phase>("Tất cả");
  const [catalogLive, setCatalogLive] = useState(false);
  const [catalogError, setCatalogError] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    let active = true;
    setIsRefreshing(true);
    fetch("/api/public-curriculum", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error("catalog_unavailable");
        return response.json() as Promise<CatalogResponse>;
      })
      .then((data) => {
        if (!active || !Array.isArray(data.activities)) return;
        setActivities(mergeActivities(data.activities));
        setCatalogLive(data.source === "database" && data.activities.length > 0);
        setCatalogError(false);
      })
      .catch(() => { if (active) { setCatalogLive(false); setCatalogError(true); } })
      .finally(() => { if (active) setIsRefreshing(false); });
    return () => { active = false; };
  }, [retryCount]);

  const visibleActivities = useMemo(() => {
    const needle = search.trim().toLocaleLowerCase("vi-VN");
    return activities.filter((activity) => {
      const guide = STUDENT_GUIDE[activity.id];
      const matchesPhase = phase === "Tất cả" || activity.phase === phase;
      const haystack = [displayTitle(activity), guide?.summary, guide?.task, activity.title, activity.description, activity.deliverable, activity.type]
        .filter(Boolean).join(" ").toLocaleLowerCase("vi-VN");
      return matchesPhase && (!needle || haystack.includes(needle));
    });
  }, [activities, phase, search]);

  const firstOpenActivity = activities.find((activity) => activity.status === "available");
  const mainLab = activities.find((activity) => activity.id === 8 && activity.status === "available");
  const phaseInfo: Record<Exclude<Phase, "Tất cả">, { title: string; subtitle: string; icon: typeof BookOpen }> = {
    "Trước lớp": { title: "Chuẩn bị trước giờ học", subtitle: "Xem bài, đặt câu hỏi và tự kiểm tra kiến thức nền.", icon: BookOpen },
    "Trên lớp": { title: "Khám phá và thực hành trên lớp", subtitle: "Thảo luận, làm thí nghiệm và luyện tập cùng lớp.", icon: FlaskConical },
    "Sau lớp": { title: "Vận dụng và ghi nhớ", subtitle: "Làm dự án, tự đánh giá và ôn tập sau buổi học.", icon: CheckCircle2 },
  };

  const renderActivity = (activity: Activity) => {
    const guide = STUDENT_GUIDE[activity.id];
    const badge = statusCopy[activity.status];
    const title = displayTitle(activity);
    const canOpen = activity.status === "available";
    return (
      <article key={activity.id} className="group flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-lg hover:shadow-blue-950/5">
        <div className="flex items-start justify-between gap-3">
          <span className="inline-flex items-center rounded-lg bg-slate-100 px-2.5 py-1.5 text-xs font-extrabold tracking-wide text-slate-700">BÀI {String(activity.id).padStart(2, "0")}</span>
          <span className={"rounded-full border px-2.5 py-1 text-[11px] font-bold " + badge.style}>{badge.label}</span>
        </div>
        <div className="mt-4 flex-1">
          <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-slate-500">
            <span className="rounded-md bg-blue-50 px-2 py-1 text-blue-800">{activity.phase}</span>
            <span className="inline-flex items-center gap-1"><Clock3 className="h-3.5 w-3.5" />{activity.duration}</span>
          </div>
          <h3 className="mt-3 text-lg font-extrabold leading-snug text-slate-900">{title}</h3>
          <p className="mt-2 text-sm leading-6 text-slate-600">{guide?.summary || activity.description}</p>
          {activity.id === 8 && <p className="mt-3 inline-flex rounded-lg bg-indigo-50 px-2.5 py-1.5 text-xs font-bold text-indigo-800">Đã gộp nội dung nguồn 8, 9, 10 và 11</p>}
          {guide?.task && <div className="mt-4 rounded-xl bg-slate-50 p-3.5 text-sm leading-5 text-slate-700"><span className="font-bold text-slate-900">Em sẽ làm:</span> {guide.task}</div>}
          {activity.deliverable && <p className="mt-3 rounded-lg border border-blue-100 bg-blue-50/60 px-3 py-2 text-xs leading-5 text-slate-700"><b className="text-slate-900">Sản phẩm cần hoàn thành:</b> {activity.deliverable}</p>}
        </div>
        <div className="mt-5 border-t border-slate-100 pt-4">
          {canOpen ? (
            <Link href={"/hoat-dong/" + activity.id} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-700 px-4 py-3 text-sm font-extrabold text-white transition hover:bg-blue-800 focus:outline-none focus:ring-4 focus:ring-blue-200">
              Mở nội dung và học liệu <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
          ) : <div className="rounded-xl bg-slate-100 px-4 py-3 text-center text-xs font-bold text-slate-500">{activity.status === "locked" ? "Bài chưa được mở" : "Bài đã kết thúc"}</div>}
        </div>
      </article>
    );
  };

  const activitiesByPhase = phase === "Tất cả"
    ? PHASES.slice(1).map((item) => ({ phase: item, activities: visibleActivities.filter((activity) => activity.phase === item) }))
    : [{ phase, activities: visibleActivities }];

  return (
    <main className="min-h-screen bg-[#f5f7fb] text-slate-900">
      <header className="border-b border-slate-200/80 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 md:px-8">
          <Link href="/" className="flex items-center gap-3" aria-label="Về trang chủ Vật lí 11">
            <span className="grid h-11 w-11 place-items-center rounded-2xl bg-blue-700 font-black text-white shadow-lg shadow-blue-900/15">V11</span>
            <span><b className="block text-sm tracking-wide">VẬT LÍ 11</b><small className="text-xs text-slate-500">Không gian học tập</small></span>
          </Link>
          <Link href="/chapters" className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">
            Tổng quan chương <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-7xl space-y-8 px-4 py-6 md:px-8 md:py-9">
        <section className="relative isolate overflow-hidden rounded-[2rem] bg-[#101c39] p-6 text-white shadow-xl shadow-blue-950/10 md:p-10">
          <div aria-hidden="true" className="absolute -right-16 -top-24 -z-10 h-80 w-80 rounded-full bg-blue-500/25 blur-3xl" />
          <div aria-hidden="true" className="absolute bottom-[-8rem] right-[30%] -z-10 h-64 w-64 rounded-full bg-indigo-400/15 blur-3xl" />
          <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_19rem] lg:items-center">
            <div>
              <p className="inline-flex items-center gap-2 rounded-full border border-indigo-200/20 bg-white/5 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.12em] text-indigo-200"><GraduationCap className="h-4 w-4" /> Không gian học tập học sinh</p>
              <h1 className="mt-5 max-w-3xl text-3xl font-black leading-tight tracking-tight md:text-5xl">Chuyên đề <span className="text-indigo-300">Tụ điện</span></h1>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-300 md:text-base">Mở bài học để đọc tài liệu, xem hướng dẫn, làm thí nghiệm ảo và tự kiểm tra. Em có thể học và xem học liệu tự do; gửi bài để cô xem cần tài khoản lớp.</p>
              <div className="mt-6 flex flex-wrap gap-3">
                {firstOpenActivity && <Link href={"/hoat-dong/" + firstOpenActivity.id} className="inline-flex items-center gap-2 rounded-xl bg-indigo-300 px-5 py-3 text-sm font-extrabold text-slate-950 transition hover:bg-indigo-200">Mở bài học đầu tiên <ArrowRight className="h-4 w-4" /></Link>}
                {mainLab && <Link href="/hoat-dong/8" className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/5 px-5 py-3 text-sm font-bold text-white transition hover:bg-white/10"><FlaskConical className="h-4 w-4" /> Mở hoạt động thực nghiệm 8</Link>}
              </div>
              <div className="mt-7 flex flex-wrap gap-x-6 gap-y-2 text-xs font-medium text-slate-300">
                <span className="inline-flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-300" /> Xem bài không cần đăng nhập</span>
                <span className="inline-flex items-center gap-2"><BookOpen className="h-4 w-4 text-indigo-300" /> 14 mục nguồn · 11 hoạt động</span>
                <span className="inline-flex items-center gap-2"><FlaskConical className="h-4 w-4 text-indigo-300" /> Gộp đúng mục 8–11</span>
              </div>
            </div>
            <div className="rounded-3xl border border-white/10 bg-white/[0.07] p-5 backdrop-blur-sm">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-indigo-200"><Sparkles className="h-4 w-4" /> Bản đồ chương</div>
              <div className="mt-5 space-y-4">
                {(["Trước lớp", "Trên lớp", "Sau lớp"] as const).map((item, index) => {
                  const info = phaseInfo[item];
                  const Icon = info.icon;
                  const count = activities.filter((activity) => activity.phase === item).length;
                  return <div key={item} className="flex items-center gap-3">
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white/10 text-indigo-200"><Icon className="h-5 w-5" /></span>
                    <div className="min-w-0 flex-1"><p className="text-sm font-bold text-white">{info.title}</p><p className="mt-0.5 text-xs text-slate-400">{count} hoạt động</p></div>
                    <span className="text-xs font-bold text-slate-500">0{index + 1}</span>
                  </div>;
                })}
              </div>
              <div className="mt-5 rounded-2xl bg-[#0b142b] p-4">
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Công thức cần nhớ</p>
                <p className="mt-2 text-2xl font-black tracking-wide text-white">C = <span className="text-indigo-300">Q</span>/<span className="text-amber-300">U</span></p>
                <p className="mt-1 text-xs leading-5 text-slate-400">Q đo bằng coulomb (C), U bằng volt (V), điện dung C bằng farad (F).</p>
              </div>
            </div>
          </div>
        </section>

        <section aria-label="Mở nhanh hoạt động học" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {[
            { id: 1, label: "Bài 1 · Khởi động", detail: "Đọc tình huống và ghi dự đoán.", icon: BookOpen },
            { id: 4, label: "Bài 4 · Phòng thí nghiệm ảo", detail: "Thử thay đổi S, d và điện môi.", icon: FlaskConical },
            { id: 6, label: "Bài 6 · Tự kiểm tra", detail: "Làm câu hỏi trước giờ học.", icon: CheckCircle2 },
            { id: 8, label: "Bài 8 · Thí nghiệm tụ điện", detail: "Mở hoạt động gộp các mục 8–11.", icon: Microscope },
          ].map(({ id, label, detail, icon: Icon }) => {
            const activity = activities.find((item) => item.id === id);
            if (!activity || activity.status !== "available") return null;
            return <Link key={id} href={"/hoat-dong/" + id} className="group flex min-h-28 items-start gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-md">
              <span className="rounded-xl bg-blue-50 p-2.5 text-blue-700"><Icon className="h-5 w-5" /></span>
              <span><b className="block text-sm text-slate-900">{label}</b><span className="mt-1 block text-xs leading-5 text-slate-500">{detail}</span><span className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-blue-700">Mở bài <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" /></span></span>
            </Link>;
          })}
        </section>
        {catalogError && <div role="status" className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950"><p>Chưa đồng bộ được thay đổi mới từ lớp. Các bài học có sẵn vẫn mở được bên dưới.</p><button type="button" disabled={isRefreshing} onClick={() => { setIsRefreshing(true); setRetryCount((count) => count + 1); }} className="inline-flex items-center gap-2 rounded-lg border border-amber-300 bg-white px-3 py-2 text-xs font-bold disabled:opacity-50"><RefreshCw className={"h-4 w-4 " + (isRefreshing ? "animate-spin" : "")} />{isRefreshing ? "Đang tải…" : "Thử đồng bộ lại"}</button></div>}

        <section className="grid gap-4 md:grid-cols-[minmax(0,1fr)_20rem]">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div><p className="text-xs font-bold uppercase tracking-wider text-blue-700">Em sẽ học gì?</p><h2 className="mt-1 text-xl font-black">Lộ trình bài học</h2><p className="mt-1 text-sm text-slate-500">Mỗi bài mở ra nội dung chi tiết, nhiệm vụ, mô phỏng hoặc phiếu tự kiểm tra.</p></div>
              <label className="relative block w-full sm:max-w-xs">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Tìm bài học…" className="w-full rounded-xl border border-slate-200 py-3 pl-10 pr-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
              </label>
            </div>
            <div className="mt-5 flex flex-wrap gap-2" role="group" aria-label="Lọc theo giai đoạn">
              {PHASES.map((item) => <button key={item} type="button" onClick={() => setPhase(item)} aria-pressed={phase === item} className={"rounded-full px-4 py-2 text-xs font-bold transition " + (phase === item ? "bg-blue-700 text-white shadow-sm" : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50")}>{item}</button>)}
            </div>
            <p className="mt-3 text-xs text-slate-500">Đang hiển thị {visibleActivities.length} / {activities.length} bài{catalogLive ? " · có dữ liệu lớp mới" : " · nội dung chương trình có sẵn"}</p>
          </div>
          <div className="flex flex-col justify-between rounded-2xl border border-blue-100 bg-blue-50/70 p-5">
            <div><div className="flex items-center gap-2 text-sm font-extrabold text-blue-950"><Zap className="h-4 w-4 text-amber-500" /> Mẹo học nhanh</div><p className="mt-2 text-sm leading-6 text-blue-950/75">Thử dự đoán kết quả trước khi bấm làm thí nghiệm. Sau đó so sánh dự đoán với số liệu em đo được.</p></div>
            <Link href="/hoat-dong/4" className="mt-4 inline-flex items-center gap-2 text-sm font-extrabold text-blue-800 hover:text-blue-950">Thử phòng thí nghiệm ảo <ArrowDown className="h-4 w-4 -rotate-45" /></Link>
          </div>
        </section>

        {visibleActivities.length === 0 ? (
          <section className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center"><Search className="mx-auto h-8 w-8 text-slate-300" /><h2 className="mt-3 font-bold">Chưa thấy bài phù hợp</h2><p className="mt-1 text-sm text-slate-500">Thử từ khóa khác hoặc xóa bộ lọc.</p><button type="button" onClick={() => { setSearch(""); setPhase("Tất cả"); }} className="mt-4 rounded-xl bg-blue-700 px-4 py-2.5 text-sm font-bold text-white">Xóa bộ lọc</button></section>
        ) : activitiesByPhase.map(({ phase: phaseName, activities: phaseActivities }) => {
          if (phaseActivities.length === 0) return null;
          const info = phaseInfo[phaseName as Exclude<Phase, "Tất cả">];
          const Icon = info.icon;
          return <section key={phaseName} className="space-y-4">
            <div className="flex items-end justify-between gap-4"><div><div className="flex items-center gap-2 text-blue-700"><Icon className="h-5 w-5" /><span className="text-xs font-extrabold uppercase tracking-wider">{phaseName}</span></div><h2 className="mt-1 text-xl font-black text-slate-900">{info.title}</h2><p className="mt-1 text-sm text-slate-500">{info.subtitle}</p></div><span className="hidden rounded-full bg-white px-3 py-1.5 text-xs font-bold text-slate-500 shadow-sm sm:inline-flex">{phaseActivities.length} bài</span></div>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{phaseActivities.map(renderActivity)}</div>
          </section>;
        })}

        <footer className="flex flex-col gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-4 text-sm text-slate-600 sm:flex-row sm:items-center sm:justify-between"><span className="inline-flex items-center gap-2 font-semibold"><CheckCircle2 className="h-4 w-4 text-emerald-600" /> Em có thể xem bài học và tài liệu mà không cần đăng nhập.</span><span className="text-xs text-slate-500">Muốn lưu bài nộp vào hồ sơ lớp, em cần được cấp tài khoản học sinh.</span></footer>
      </div>
    </main>
  );
}
