"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, BookOpen, CheckCircle2, Clock3, FlaskConical, GraduationCap, RefreshCw, Search } from "lucide-react";
import { ACTIVITIES, type Activity } from "@/lib/data/activities";

type CatalogRow = Partial<Activity> & { id: number | string; phase?: string | null; status?: string | null };
type CatalogResponse = { activities?: CatalogRow[] };
const PHASES = ["Tất cả", "Trước lớp", "Trên lớp", "Sau lớp"] as const;

const fromCatalogRow = (row: CatalogRow, fallbackById: Map<number, Activity>): Activity => {
  const id = Number(row.id);
  const fallback = fallbackById.get(id);
  return {
    id,
    code: row.code || fallback?.code || "HĐ" + String(id),
    title: row.title || fallback?.title || "Hoạt động " + String(id),
    phase: (row.phase || fallback?.phase || "Trên lớp") as Activity["phase"],
    type: (row.type || fallback?.type || "Bài tập") as Activity["type"],
    duration: row.duration || fallback?.duration || "Theo hướng dẫn giáo viên",
    status: (row.status || fallback?.status || "locked") as Activity["status"],
    description: row.description || fallback?.description || "",
    deliverable: row.deliverable || fallback?.deliverable || "",
    course_id: row.course_id || fallback?.course_id,
    chapter_id: row.chapter_id || fallback?.chapter_id,
    accepting_submissions: row.accepting_submissions ?? fallback?.accepting_submissions,
    deadline: row.deadline ?? fallback?.deadline ?? null,
    document_url: row.document_url || fallback?.document_url,
    video_url: row.video_url || fallback?.video_url,
  };
};

const statusCopy: Record<Activity["status"], { label: string; style: string }> = {
  available: { label: "Đang mở", style: "border-emerald-200 bg-emerald-50 text-emerald-800" },
  locked: { label: "Chưa mở", style: "border-slate-200 bg-slate-100 text-slate-500" },
  done: { label: "Đã đóng", style: "border-slate-200 bg-slate-100 text-slate-500" },
};

export default function StudentPortalPreview() {
  const [activities, setActivities] = useState<Activity[]>(ACTIVITIES);
  const [search, setSearch] = useState("");
  const [phase, setPhase] = useState<(typeof PHASES)[number]>("Tất cả");
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
        const fallbackById = new Map(ACTIVITIES.map((activity) => [activity.id, activity]));
        setActivities(data.activities.map((row) => fromCatalogRow(row, fallbackById)));
        setCatalogLive(true);
        setCatalogError(false);
      })
      .catch(() => { if (active) { setCatalogLive(false); setCatalogError(true); } })
      .finally(() => { if (active) setIsRefreshing(false); });
    return () => { active = false; };
  }, [retryCount]);

  const visibleActivities = useMemo(() => {
    const needle = search.trim().toLocaleLowerCase("vi-VN");
    return activities.filter((activity) => {
      const matchesPhase = phase === "Tất cả" || activity.phase === phase;
      const haystack = [activity.code, activity.title, activity.description, activity.deliverable, activity.type].join(" ").toLocaleLowerCase("vi-VN");
      return matchesPhase && (!needle || haystack.includes(needle));
    });
  }, [activities, phase, search]);
  const openCount = activities.filter((activity) => activity.status === "available").length;
  const labCount = activities.filter((activity) => activity.type === "Thí nghiệm").length;
  const firstOpenActivity = activities.find((activity) => activity.status === "available");
  const mainLab = activities.find((activity) => activity.id === 8);

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 md:px-8">
          <Link href="/" className="flex items-center gap-3" aria-label="Về trang chủ Vật lí 11">
            <span className="grid h-11 w-11 place-items-center rounded-2xl bg-blue-700 font-black text-white">V11</span>
            <span><b className="block text-sm tracking-wide">VẬT LÍ 11</b><small className="text-xs text-slate-500">Khu vực học sinh</small></span>
          </Link>
          <Link href="/chapters" className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">
            Tổng quan chương <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 md:px-8 md:py-8">
        <section className="rounded-3xl bg-slate-950 p-6 text-white shadow-sm md:p-8">
          <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
            <div className="max-w-3xl">
              <p className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-cyan-300"><GraduationCap className="h-4 w-4" /> Chương học</p>
              <h1 className="mt-3 text-3xl font-black tracking-tight md:text-4xl">Chuyên đề Tụ điện</h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">Chọn bài để xem nội dung, tài liệu và yêu cầu học tập. Chương hiện có {activities.length} hoạt động; các mục nguồn 8–11 được gộp trong một hoạt động thí nghiệm.</p>
              <div className="mt-5 flex flex-wrap gap-3">
                {firstOpenActivity ? <Link href={"/hoat-dong/" + firstOpenActivity.id} className="inline-flex items-center gap-2 rounded-xl bg-cyan-300 px-4 py-3 text-sm font-extrabold text-slate-950 transition hover:bg-cyan-200">Bắt đầu: {firstOpenActivity.title}<ArrowRight className="h-4 w-4" /></Link> : <span className="rounded-xl border border-white/15 px-4 py-3 text-sm text-slate-300">Hiện chưa có bài học được mở.</span>}
                {mainLab && <Link href={"/hoat-dong/" + mainLab.id} className="inline-flex items-center gap-2 rounded-xl border border-white/20 px-4 py-3 text-sm font-bold text-white transition hover:bg-white/10"><FlaskConical className="h-4 w-4" /> Mở thí nghiệm tụ điện</Link>}
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2 lg:min-w-[300px]">
              <div className="rounded-xl border border-white/10 bg-white/5 p-3"><BookOpen className="h-4 w-4 text-cyan-300" /><b className="mt-2 block text-xl">{activities.length}</b><span className="text-[10px] text-slate-300">hoạt động</span></div>
              <div className="rounded-xl border border-white/10 bg-white/5 p-3"><CheckCircle2 className="h-4 w-4 text-emerald-300" /><b className="mt-2 block text-xl">{openCount}</b><span className="text-[10px] text-slate-300">đang mở</span></div>
              <div className="rounded-xl border border-white/10 bg-white/5 p-3"><FlaskConical className="h-4 w-4 text-violet-300" /><b className="mt-2 block text-xl">{labCount}</b><span className="text-[10px] text-slate-300">thí nghiệm</span></div>
            </div>
          </div>
        </section>

        {catalogError && <div role="status" className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950"><p>{catalogLive ? "" : "Chưa tải được thay đổi mới từ lớp; đang giữ nội dung chương trình có sẵn."}</p><button type="button" disabled={isRefreshing} onClick={() => { setIsRefreshing(true); setRetryCount((count) => count + 1); }} className="inline-flex items-center gap-2 rounded-lg border border-amber-300 bg-white px-3 py-2 text-xs font-bold disabled:opacity-50"><RefreshCw className={"h-4 w-4 " + (isRefreshing ? "animate-spin" : "")} />{isRefreshing ? "Đang tải…" : "Tải lại"}</button></div>}

        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div><h2 className="text-lg font-extrabold">Danh sách bài học và nhiệm vụ</h2><p className="mt-1 text-sm text-slate-500">Mỗi bài có nội dung, tài liệu và yêu cầu riêng.</p></div>
            <label className="relative block w-full lg:max-w-sm">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Tìm tên bài hoặc nội dung…" className="w-full rounded-xl border border-slate-200 py-3 pl-10 pr-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
            </label>
          </div>
          <div className="mt-4 flex flex-wrap gap-2" role="group" aria-label="Lọc theo giai đoạn">
            {PHASES.map((item) => <button key={item} type="button" onClick={() => setPhase(item)} aria-pressed={phase === item} className={"rounded-full px-4 py-2 text-xs font-bold transition " + (phase === item ? "bg-blue-700 text-white" : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50")}>{item}</button>)}
          </div>
          <p className="mt-3 text-xs text-slate-500">{visibleActivities.length} / {activities.length} hoạt động {catalogLive ? "· đã tải dữ liệu lớp mới nhất" : "· nội dung chương trình có sẵn"}</p>
        </section>

        {visibleActivities.length === 0 ? (
          <section className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
            <Search className="mx-auto h-8 w-8 text-slate-300" />
            <h2 className="mt-3 font-bold">Không tìm thấy bài phù hợp</h2>
            <p className="mt-1 text-sm text-slate-500">Thử từ khóa khác hoặc xóa bộ lọc.</p>
            <button type="button" onClick={() => { setSearch(""); setPhase("Tất cả"); }} className="mt-4 rounded-xl bg-blue-700 px-4 py-2.5 text-sm font-bold text-white">Xóa bộ lọc</button>
          </section>
        ) : (
          <div className="space-y-3">
            {visibleActivities.map((activity) => {
              const badge = statusCopy[activity.status];
              const canOpen = activity.status === "available";
              return (
                <article key={activity.id} className={"grid gap-4 rounded-2xl border bg-white p-4 shadow-sm md:grid-cols-[5.5rem_minmax(0,1fr)_12rem] md:items-center md:p-5 " + (activity.id === 8 ? "border-cyan-300 ring-1 ring-cyan-100" : "border-slate-200")}>
                  <div className="flex items-center gap-2 md:flex-col md:items-start">
                    <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-extrabold text-slate-700">{activity.code}</span>
                    <span className={"rounded-full border px-2.5 py-1 text-[10px] font-bold " + badge.style}>{badge.label}</span>
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] font-semibold text-slate-500"><span className="rounded-md bg-blue-50 px-2 py-1 text-blue-800">{activity.phase}</span><span className="inline-flex items-center gap-1"><Clock3 className="h-3.5 w-3.5" />{activity.duration}</span><span>{activity.type}</span></div>
                    <h3 className="mt-2 text-base font-extrabold leading-snug text-slate-900">{activity.title}</h3>
                    <p className="mt-1 text-sm leading-6 text-slate-600">{activity.description}</p>
                    {activity.deliverable && <p className="mt-2 text-xs leading-5 text-slate-700"><b>Cần hoàn thành:</b> {activity.deliverable}</p>}
                  </div>
                  <div className="md:justify-self-end md:w-full">
                    {canOpen ? <Link href={"/hoat-dong/" + activity.id} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-700 px-4 py-3 text-sm font-bold text-white transition hover:bg-blue-800">Mở bài và tài liệu <ArrowRight className="h-4 w-4" /></Link> : <div className="rounded-xl bg-slate-100 px-4 py-3 text-center text-xs font-bold text-slate-500">{activity.status === "locked" ? "Bài chưa được mở" : "Đã kết thúc"}</div>}
                  </div>
                </article>
              );
            })}
          </div>
        )}

        <footer className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-xs leading-5 text-slate-600">Nội dung bài học công khai có thể xem trực tiếp. Bài nộp, điểm và trao đổi cá nhân chỉ dùng khi tài khoản học sinh được bật.</footer>
      </div>
    </main>
  );
}
