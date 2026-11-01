"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CHAPTERS } from "@/lib/data/chapters";
import { ACTIVITIES, type Activity } from "@/lib/data/activities";
import { COURSES } from "@/lib/data/courses";
import { BookOpen, Play, CheckCircle, Lock, ArrowRight, GraduationCap } from "lucide-react";

type CatalogCourse = { id: string; title: string; description: string; grade_level: number; subject: string };
type CatalogChapter = { id: string; title: string; description: string; course_id: string };
type CatalogActivity = Partial<Activity> & {
  id: number | string;
  course_id?: string | null;
  chapter_id?: string | null;
  accepting_submissions?: boolean;
  deadline?: string | null;
};

const FALLBACK_COURSES: CatalogCourse[] = COURSES;
const FALLBACK_CHAPTERS: CatalogChapter[] = CHAPTERS;

const PHASE_COLORS: Record<string, string> = {
  "Trước lớp": "bg-blue-50 text-blue-700 border-blue-100",
  "Trên lớp": "bg-orange-50 text-orange-700 border-orange-100",
  "Sau lớp": "bg-emerald-50 text-emerald-700 border-emerald-100",
};

const STATUS_STYLES: Record<string, string> = {
  available: "bg-green-100 text-green-700 border-green-200",
  locked: "bg-gray-100 text-gray-500 border-gray-200",
  done: "bg-emerald-100 text-emerald-700 border-emerald-200",
};

function preferredCourse(courses: CatalogCourse[]) {
  return courses.find((course) => course.grade_level === 11 && /vật\s*l[ií]|physics/i.test(`${course.title} ${course.subject}`))?.id || courses[0]?.id || "";
}

function preferredChapter(chapters: CatalogChapter[], courseId: string) {
  const courseChapters = chapters.filter((chapter) => chapter.course_id === courseId);
  return courseChapters.find((chapter) => /tụ\s*điện/i.test(chapter.title))?.id || courseChapters[0]?.id || null;
}

function toActivity(row: CatalogActivity, fallbackById: Map<number, Activity>): Activity {
  const numericId = Number(row.id);
  const fallback = fallbackById.get(numericId);
  return {
    id: numericId,
    code: row.code || fallback?.code || `HĐ${row.id}`,
    title: row.title || fallback?.title || `Hoạt động ${row.id}`,
    description: row.description || fallback?.description || "",
    phase: (row.phase || fallback?.phase || "Trên lớp") as Activity["phase"],
    type: (row.type || fallback?.type || "Bài tập") as Activity["type"],
    duration: row.duration || fallback?.duration || "Theo hướng dẫn giáo viên",
    status: (row.status || fallback?.status || "locked") as Activity["status"],
    deliverable: row.deliverable || fallback?.deliverable || "",
    video_url: row.video_url || fallback?.video_url,
    document_url: row.document_url || fallback?.document_url,
    course_id: row.course_id || fallback?.course_id,
    chapter_id: row.chapter_id || fallback?.chapter_id,
    accepting_submissions: row.accepting_submissions ?? fallback?.accepting_submissions,
    deadline: row.deadline ?? fallback?.deadline,
  };
}

export default function ChapterDashboard() {
  const [courses, setCourses] = useState<CatalogCourse[]>(FALLBACK_COURSES);
  const [chapters, setChapters] = useState<CatalogChapter[]>(FALLBACK_CHAPTERS);
  const [selectedCourse, setSelectedCourse] = useState<string>(FALLBACK_COURSES[0]?.id || "");
  const [expandedChapter, setExpandedChapter] = useState<string | null>(FALLBACK_CHAPTERS[0]?.id || null);
  const [activities, setActivities] = useState<Activity[]>(ACTIVITIES);
  const [catalogError, setCatalogError] = useState(false);

  useEffect(() => {
    let active = true;
    fetch("/api/public-curriculum", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error("catalog_unavailable");
        return response.json() as Promise<{ courses: CatalogCourse[]; chapters: CatalogChapter[]; activities: CatalogActivity[] }>;
      })
      .then((data) => {
        if (!active) return;
        const nextCourses = Array.isArray(data.courses) ? data.courses.map((course) => ({ ...course, id: String(course.id) })) : [];
        const nextChapters = Array.isArray(data.chapters) ? data.chapters.map((chapter) => ({ ...chapter, id: String(chapter.id), course_id: String(chapter.course_id) })) : [];
        const fallbackById = new Map(ACTIVITIES.map((activity) => [activity.id, activity]));
        const nextActivities = Array.isArray(data.activities) ? data.activities.map((row) => toActivity(row, fallbackById)) : [];
        const nextCourseId = preferredCourse(nextCourses);
        setCourses(nextCourses);
        setChapters(nextChapters);
        setActivities(nextActivities);
        setSelectedCourse(nextCourseId);
        setExpandedChapter((current) => current && nextChapters.some((chapter) => chapter.id === current)
          ? current
          : preferredChapter(nextChapters, nextCourseId));
      })
      .catch(() => {
        if (active) setCatalogError(true);
      });
    return () => { active = false; };
  }, []);

  const filteredChapters = chapters.filter((chapter) => chapter.course_id === selectedCourse);
  const chapterProgress = (chapterId: string) => {
    const acts = activities.filter((activity) => activity.chapter_id === chapterId);
    if (acts.length === 0) return 0;
    return Math.round((acts.filter((activity) => activity.status === "done").length / acts.length) * 100);
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4 md:p-8">
      <div className="mx-auto max-w-7xl space-y-8">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div>
            <h1 className="text-3xl font-extrabold text-gray-900">Chương trình học</h1>
            <p className="mt-1 text-sm text-gray-500">Toàn bộ chương và hoạt động được phát hành cho lớp học.</p>
            <p className="mt-2 text-xs text-slate-500">Đề cương gồm 14 mục nguồn; các mục 8–11 được tổ chức thành một hoạt động thực nghiệm.</p>
          </div>
          <Link href="/" className="flex items-center gap-2 font-medium text-blue-600 hover:text-blue-700">
            <ArrowRight className="h-4 w-4" /> Về trang chủ
          </Link>
        </div>

        {catalogError && <div role="status" className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">Chưa kết nối được danh mục trực tuyến. Danh sách đang hiển thị dữ liệu nội dung đã đóng gói; bài và chương mới do giáo viên tạo sẽ xuất hiện sau khi kết nối cơ sở dữ liệu hoạt động.</div>}

        <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-4">
            <label htmlFor="course-select" className="text-sm font-medium text-gray-700">Môn học:</label>
            <select id="course-select" value={selectedCourse} onChange={(event) => { setSelectedCourse(event.target.value); setExpandedChapter(preferredChapter(chapters, event.target.value)); }} className="rounded-xl border border-gray-200 bg-white p-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500">
              {courses.map((course) => <option key={course.id} value={course.id}>{course.title} (Khối {course.grade_level})</option>)}
            </select>
          </div>
        </div>

        {filteredChapters.length === 0 && <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">Chưa có chương học nào được xếp vào môn học này.</div>}
        <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2">
          {filteredChapters.map((chapter, chapterIndex) => {
            const chapterActivities = activities.filter((activity) => activity.chapter_id === chapter.id && activity.course_id === selectedCourse);
            const isExpanded = expandedChapter === chapter.id;
            const pct = chapterProgress(chapter.id);
            return <section key={chapter.id} className="group overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm transition-all hover:shadow-md">
              <div className="border-b border-gray-100 bg-blue-50/50 p-6">
                <div className="mb-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 font-bold text-white">{chapterIndex + 1}</div>
                    <div><h2 className="text-xl font-bold text-gray-900">{chapter.title}</h2><p className="text-xs text-gray-500">{chapter.description}</p></div>
                  </div>
                  <button type="button" aria-expanded={isExpanded} aria-label={`${isExpanded ? "Thu gọn" : "Mở"} ${chapter.title}`} onClick={() => setExpandedChapter(isExpanded ? null : chapter.id)} className="rounded-lg border border-gray-200 bg-white p-2 text-gray-500 transition-colors hover:bg-blue-50 hover:text-blue-600">
                    {isExpanded ? <CheckCircle className="h-5 w-5" /> : <Play className="h-5 w-5" />}
                  </button>
                </div>
                <div className="mb-2">
                  <div className="mb-1 flex justify-between text-xs font-semibold text-gray-500"><span>Tiến độ</span><span>{pct}%</span></div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200"><div className="h-full rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 transition-all duration-500" style={{ width: `${pct}%` }} /></div>
                </div>
                <div className="mt-2 flex items-center gap-3 text-xs text-gray-500">
                  <span className="flex items-center gap-1"><BookOpen className="h-3 w-3" /> {chapterActivities.length} hoạt động</span>
                  <span>{chapterActivities.filter((activity) => activity.status === "available").length} hoạt động đang phát hành</span>
                </div>
              </div>
              {isExpanded && <div className="p-0"><div className="divide-y divide-gray-100">
                {chapterActivities.map((activity) => {
                  const phaseColor = PHASE_COLORS[activity.phase] || "bg-gray-100 text-gray-600";
                  const statusStyle = STATUS_STYLES[activity.status] || "bg-gray-100 text-gray-500";
                  return <div key={activity.id} className="group flex items-center justify-between gap-4 p-5 transition-colors hover:bg-gray-50">
                    <div className="min-w-0 flex-1">
                      <div className="mb-1 flex flex-wrap items-center gap-2">
                        <span className={`rounded border px-2 py-0.5 text-[10px] font-bold ${phaseColor}`}>{activity.phase}</span>
                        <span className="text-[10px] font-semibold text-slate-600">{activity.type}</span>
                        <span className={`rounded border px-2 py-0.5 text-[10px] font-bold ${statusStyle}`}>{activity.status === "available" ? "Đang phát hành" : activity.status === "done" ? "Hoàn thành" : "Chưa phát hành"}</span>
                      </div>
                      <div className="flex items-center gap-2"><span className="font-mono text-[10px] text-gray-400">{activity.code}</span><h3 className="font-semibold text-gray-800">{activity.title}</h3></div>
                      <p className="mt-0.5 text-xs text-gray-500">{activity.duration} · {activity.deliverable}</p>
                      <p className="mt-1 line-clamp-2 text-xs text-gray-500">{activity.description}</p>
                      {activity.status === "available" && activity.accepting_submissions === false && <p className="mt-1 text-xs font-medium text-amber-700">Đã đóng nhận bài</p>}
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      {activity.status === "available" ? <Link href={`/hoat-dong/${activity.id}`} aria-label={`Mở ${activity.title}`} className="rounded-lg border border-blue-200 bg-white p-2 text-blue-600 transition-colors hover:bg-blue-50 hover:text-blue-700"><ArrowRight className="h-4 w-4" /></Link> : <span className="rounded-lg border border-gray-200 bg-gray-50 p-2 text-gray-400" title="Nội dung chưa được phát hành"><Lock className="h-4 w-4" /></span>}
                    </div>
                  </div>;
                })}
              </div>{chapterActivities.length === 0 && <div className="p-6 text-center text-sm text-gray-400">Chưa có hoạt động nào được xếp vào chương này.</div>}</div>}
            </section>;
          })}
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <StatCard title="Tổng chương" value={filteredChapters.length} icon={<GraduationCap className="h-5 w-5" />} color="text-blue-600" />
          <StatCard title="Tổng hoạt động" value={activities.filter((activity) => activity.course_id === selectedCourse).length} icon={<BookOpen className="h-5 w-5" />} color="text-indigo-600" />
          <StatCard title="Hoàn thành" value={activities.filter((activity) => activity.course_id === selectedCourse && activity.status === "done").length} icon={<CheckCircle className="h-5 w-5" />} color="text-emerald-600" />
        </div>
      </div>
    </main>
  );
}

function StatCard({ title, value, icon, color }: { title: string; value: number; icon: React.ReactNode; color: string }) {
  return <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm"><div className="flex items-center justify-between"><div><p className="text-xs font-semibold uppercase tracking-wider text-gray-500">{title}</p><p className="mt-1 text-2xl font-bold text-gray-900">{value}</p></div><div className={`rounded-lg p-2.5 ${color} ${color === "text-blue-600" ? "bg-blue-50" : color === "text-indigo-600" ? "bg-indigo-50" : "bg-emerald-50"}`}>{icon}</div></div></div>;
}
