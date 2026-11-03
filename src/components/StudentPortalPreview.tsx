"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, BookOpen, CheckCircle2, Clock3, FlaskConical, GraduationCap, Search, Sparkles } from "lucide-react";
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

  useEffect(() => {
    let active = true;
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
      })
      .catch(() => { if (active) setCatalogLive(false); });
    return () => { active = false; };
  }, []);

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

  return (
    <main className="min-h-screen bg-[#f5f7fb] text-slate-900">
      <header className="border-b border-white/10 bg-slate-950 text-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 md:px-8">
          <Link href="/" className="flex items-center gap-3" aria-label="Về trang chủ Vật lí 11">
            <span className="grid h-11 w-11 place-items-center rounded-2xl bg-cyan-400 font-black text-slate-950">V11</span>
            <span><b className="block text-sm tracking-wide">VẬT LÍ 11</b><small className="text-xs text-slate-400">Không gian học tập</small></span>
          </Link>
          <Link href="/chapters" className="inline-flex items-center gap-2 rounded-xl border border-white/15 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/10">
            Tổng quan chương <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-7xl space-y-7 px-4 py-7 md:px-8 md:py-10">
        <section className="overflow-hidden rounded-[2rem] bg-gradient-to-br from-slate-950 via-blue-950 to-cyan-900 p-6 text-white shadow-xl md:p-9">
          <div className="grid gap-8 lg:grid-cols-[1fr_auto] lg:items-end">
            <div className="max-w-3xl">
              <p className="inline-flex items-center gap-2 rounded-full border border-cyan-200/20 bg-white/10 px-3 py-1.5 text-xs font-bold text-cyan-100"><GraduationCap className="h-4 w-4" /> DÀNH CHO HỌC SINH</p>
              <h1 className="mt-4 text-3xl font-black tracking-tight md:text-5xl">Học theo từng hoạt động, hiểu đến bản chất</h1>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-blue-100 md:text-base">Mở bài học, đọc nhiệm vụ, xem tài liệu và thực hành thí nghiệm tụ điện. Các nội dung bên dưới lấy theo chương trình đã phát hành của lớp.</p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link href="/hoat-dong/1" className="inline-flex items-center gap-2 rounded-xl bg-cyan-300 px-5 py-3 text-sm font-extrabold text-slate-950 shadow-lg transition hover:bg-cyan-200">Bắt đầu bài 1 <ArrowRight className="h-4 w-4" /></Link>
                <Link href="/hoat-dong/8" className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-5 py-3 text-sm font-bold text-white transition hover:bg-white/15"><FlaskConical className="h-4 w-4" /> Mở hoạt động thí nghiệm</Link>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2 lg:w-[330px]">
              <div className="rounded-2xl border border-white/10 bg-white/10 p-4"><BookOpen className="h-5 w-5 text-cyan-200" /><b className="mt-3 block text-2xl">{activities.length}</b><span className="text-[11px] text-blue-100">hoạt động</span></div>
              <div className="rounded-2xl border border-white/10 bg-white/10 p-4"><CheckCircle2 className="h-5 w-5 text-emerald-200" /><b className="mt-3 block text-2xl">{openCount}</b><span className="text-[11px] text-blue-100">đang mở</span></div>
              <div className="rounded-2xl border border-white/10 bg-white/10 p-4"><FlaskConical className="h-5 w-5 text-violet-200" /><b className="mt-3 block text-2xl">{labCount}</b><span className="text-[11px] text-blue-100">thí nghiệm</span></div>
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm md:p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div><h2 className="text-xl font-black">Bài học và nhiệm vụ</h2><p className="mt-1 text-sm text-slate-500">Tìm theo tên bài, nội dung hoặc sản phẩm cần nộp.</p></div>
            <label className="relative block w-full lg:max-w-sm">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Ví dụ: điện dung, năng lượng…" className="w-full rounded-xl border border-slate-200 py-3 pl-10 pr-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
            </label>
          </div>
          <div className="mt-4 flex flex-wrap gap-2" role="group" aria-label="Lọc theo giai đoạn">
            {PHASES.map((item) => <button key={item} type="button" onClick={() => setPhase(item)} aria-pressed={phase === item} className={"rounded-full px-4 py-2 text-xs font-bold transition " + (phase === item ? "bg-blue-700 text-white shadow-sm" : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50")}>{item}</button>)}
          </div>
          <p className="mt-3 text-xs text-slate-500">{visibleActivities.length} / {activities.length} hoạt động {catalogLive ? "· dữ liệu lớp đã cập nhật" : "· nội dung chương trình sẵn có"}</p>
        </section>

        {visibleActivities.length === 0 ? (
          <section className="rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center">
            <Search className="mx-auto h-8 w-8 text-slate-300" />
            <h2 className="mt-3 font-bold">Chưa tìm thấy hoạt động phù hợp</h2>
            <p className="mt-1 text-sm text-slate-500">Thử từ khóa khác hoặc xóa bộ lọc để xem toàn bộ chương.</p>
            <button type="button" onClick={() => { setSearch(""); setPhase("Tất cả"); }} className="mt-4 rounded-xl bg-blue-700 px-4 py-2.5 text-sm font-bold text-white hover:bg-blue-800">Xóa bộ lọc</button>
          </section>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {visibleActivities.map((activity) => {
              const badge = statusCopy[activity.status];
              const canOpen = activity.status === "available";
              return (
                <article key={activity.id} className={"group flex flex-col overflow-hidden rounded-3xl border bg-white shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-lg " + (activity.id === 8 ? "border-cyan-300 ring-1 ring-cyan-100" : "border-slate-200")}>
                  <div className={"h-1.5 " + (activity.id === 8 ? "bg-gradient-to-r from-cyan-400 to-blue-700" : "bg-gradient-to-r from-blue-500 to-indigo-500")} />
                  <div className="flex flex-1 flex-col p-5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-[11px] font-extrabold text-slate-700">{activity.code}</span>
                      <span className={"rounded-full border px-2.5 py-1 text-[10px] font-bold " + badge.style}>{badge.label}</span>
                    </div>
                    <h3 className="mt-4 text-lg font-extrabold leading-snug text-slate-900">{activity.title}</h3>
                    <p className="mt-2 line-clamp-3 text-sm leading-6 text-slate-600">{activity.description}</p>
                    <div className="mt-4 rounded-2xl bg-slate-50 p-3">
                      <div className="flex items-center gap-2 text-[11px] font-bold text-slate-500"><Sparkles className="h-3.5 w-3.5 text-amber-500" /> SẢN PHẨM HỌC TẬP</div>
                      <p className="mt-1.5 text-xs leading-5 text-slate-700">{activity.deliverable}</p>
                    </div>
                    <div className="mt-4 flex flex-wrap items-center gap-2 text-[11px] font-semibold text-slate-500">
                      <span className="rounded-lg bg-blue-50 px-2.5 py-1 text-blue-800">{activity.phase}</span>
                      <span className="inline-flex items-center gap-1"><Clock3 className="h-3.5 w-3.5" />{activity.duration}</span>
                      <span>{activity.type}</span>
                    </div>
                    <div className="mt-auto pt-5">
                      {canOpen ? <Link href={"/hoat-dong/" + activity.id} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-3 text-sm font-bold text-white transition hover:bg-blue-800">Mở nội dung bài học <ArrowRight className="h-4 w-4" /></Link> : <div className="rounded-xl bg-slate-100 px-4 py-3 text-center text-xs font-bold text-slate-500">{activity.status === "locked" ? "Bài học chưa được mở" : "Hoạt động đã kết thúc"}</div>}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}

        <footer className="rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-xs leading-5 text-blue-950"><b>Chế độ xem học sinh:</b> bài học và tài liệu công khai có thể mở ngay. Không tạo tên, tiến độ hay điểm mẫu; bài nộp và kết quả riêng chỉ hiện trong phiên tài khoản thật.</footer>
      </div>
    </main>
  );
}
