"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CHAPTERS } from "@/lib/data/chapters";
import { ACTIVITIES, type Activity } from "@/lib/data/activities";
import { COURSES } from "@/lib/data/courses";
import { supabase } from "@/lib/supabase";
import { BookOpen, Play, CheckCircle, Lock, ArrowRight, GraduationCap } from "lucide-react";

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

export default function ChapterDashboard() {
  const [selectedCourse, setSelectedCourse] = useState<string>("phys-11");
  const [expandedChapter, setExpandedChapter] = useState<number | null>(4);
  const [activities, setActivities] = useState<Activity[]>(ACTIVITIES);

  useEffect(() => {
    let active = true;
    supabase.from("activities")
      .select("id,title,description,phase,type,duration,status,deliverable,video_url,document_url")
      .order("id")
      .limit(200)
      .then(({ data }) => {
        if (!active || !data?.length) return;
        const fallbackById = new Map(ACTIVITIES.map((activity) => [activity.id, activity]));
        const databaseActivities = data.map((row) => {
          const fallback = fallbackById.get(row.id);
          return {
            ...fallback,
            id: row.id,
            code: fallback?.code || `HĐ${row.id}`,
            title: row.title || fallback?.title || `Hoạt động ${row.id}`,
            description: row.description || fallback?.description || "",
            phase: (row.phase || fallback?.phase || "Trên lớp") as Activity["phase"],
            type: (row.type || fallback?.type || "Bài tập") as Activity["type"],
            duration: row.duration || fallback?.duration || "Theo hướng dẫn giáo viên",
            status: (row.status || fallback?.status || "locked") as Activity["status"],
            deliverable: row.deliverable || fallback?.deliverable || "",
            video_url: row.video_url || fallback?.video_url,
            document_url: row.document_url || fallback?.document_url,
            course_id: fallback?.course_id || "phys-11",
            chapter_id: fallback?.chapter_id || "4",
          } satisfies Activity;
        });
        setActivities(databaseActivities);
      });
    return () => { active = false; };
  }, []);

  const filteredChapters = CHAPTERS.filter((c) => c.course_id === selectedCourse);

  const chapterProgress = (chapterId: number) => {
    const acts = activities.filter((a) => a.chapter_id === String(chapterId));
    if (acts.length === 0) return 0;
    const done = acts.filter((a) => a.status === "done").length;
    return Math.round((done / acts.length) * 100);
  };

  return (
    <main className="min-h-screen p-4 md:p-8 bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold text-gray-900">Chương trình học</h1>
            <p className="text-gray-500 text-sm mt-1">Lộ trình chương Tụ điện theo mô hình lớp học đảo ngược</p>
            <p className="text-xs text-amber-700 mt-2">Một hoạt động mẫu đang mở; các mục còn lại là khung nội dung dự kiến theo đề cương.</p>
          </div>
          <Link href="/" className="flex items-center gap-2 text-blue-600 font-medium hover:text-blue-700">
            <ArrowRight className="w-4 h-4" /> Về trang chủ
          </Link>
        </div>

        {/* Course selector */}
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium text-gray-700">Môn học:</span>
            <select
              value={selectedCourse}
              onChange={(e) => setSelectedCourse(e.target.value)}
              className="p-2.5 border border-gray-200 rounded-xl bg-white focus:ring-2 focus:ring-blue-500 outline-none text-sm"
            >
              {COURSES.map((course) => (
                <option key={course.id} value={course.id}>
                  {course.title} (Khối {course.grade_level})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Chapters grid */}
        <div className="grid md:grid-cols-1 lg:grid-cols-2 gap-6">
          {filteredChapters.map((chapter) => {
            const chapterActivities = activities.filter((a) => a.chapter_id === String(chapter.id));
            const isExpanded = expandedChapter === chapter.id;
            const pct = chapterProgress(chapter.id);

            return (
              <div
                key={chapter.id}
                className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden transition-all hover:shadow-md group"
              >
                <div className="p-6 bg-blue-50/50 border-b border-gray-100">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold">
                        {chapter.id}
                      </div>
                      <div>
                        <h3 className="font-bold text-xl text-gray-900">{chapter.title}</h3>
                        <p className="text-xs text-gray-500">{chapter.description}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => setExpandedChapter(isExpanded ? null : chapter.id)}
                      className="p-2 rounded-lg bg-white border border-gray-200 text-gray-500 hover:bg-blue-50 hover:text-blue-600 transition-colors"
                    >
                      {isExpanded ? <CheckCircle className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                    </button>
                  </div>

                  {/* Progress bar */}
                  <div className="mb-2">
                    <div className="flex justify-between text-xs font-semibold text-gray-500 mb-1">
                      <span>Tiến độ</span>
                      <span>{pct}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                      <div className="bg-gradient-to-r from-blue-500 to-indigo-500 h-full rounded-full transition-all duration-500" style={{ width: `${pct}%` }}></div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 text-xs text-gray-500 mt-2">
                    <span className="flex items-center gap-1"><BookOpen className="w-3 h-3" /> {chapterActivities.length} hoạt động</span>
                    <span>{chapterActivities.filter((activity) => activity.status === "available").length} mẫu đang mở</span>
                  </div>
                </div>

                {isExpanded && (
                  <div className="p-0">
                    <div className="divide-y divide-gray-100">
                      {chapterActivities.map((activity) => {
                        const phaseColor = PHASE_COLORS[activity.phase] || "bg-gray-100 text-gray-600";
                        const statusStyle = STATUS_STYLES[activity.status] || "bg-gray-100 text-gray-500";
                        return (
                          <div key={activity.id} className="p-5 flex items-center justify-between hover:bg-gray-50 transition-colors group">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${phaseColor}`}>{activity.phase}</span>
                                <span className="text-[10px] font-semibold text-slate-600">{activity.type}</span>
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${statusStyle}`}>
                                  {activity.status === "available" ? "Mẫu tương tác" : activity.status === "locked" ? "Theo đề cương" : "Hoàn thành"}
                                </span>
                              </div>
                              <div className="flex items-center gap-2"><span className="text-[10px] font-mono text-gray-400">{activity.code}</span><h4 className="font-semibold text-gray-800">{activity.title}</h4></div>
                              <p className="text-xs text-gray-500 mt-0.5">{activity.duration} · {activity.deliverable}</p>
                              <p className="text-xs text-gray-500 mt-1 line-clamp-2">{activity.description}</p>
                            </div>
                            <div className="flex items-center gap-2">
                              {activity.status === "available" ? (<Link href={`/hoat-dong/${activity.id}`} aria-label={`Mở ${activity.title}`} className="p-2 rounded-lg bg-white border border-blue-200 text-blue-600 hover:bg-blue-50 hover:text-blue-700 transition-colors"><ArrowRight className="w-4 h-4" /></Link>) : (<span className="p-2 rounded-lg bg-gray-50 border border-gray-200 text-gray-400" title="Nội dung đang được lên kế hoạch"><Lock className="w-4 h-4" /></span>)}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    {chapterActivities.length === 0 && (
                      <div className="p-6 text-center text-gray-400 text-sm">Chưa có bài học nào trong chương này.</div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Quick stats */}
        <div className="grid md:grid-cols-3 gap-4">
          <StatCard title="Tổng chương" value={filteredChapters.length} icon={<GraduationCap className="w-5 h-5" />} color="text-blue-600" />
          <StatCard title="Tổng bài học" value={activities.filter((a) => a.course_id === selectedCourse).length} icon={<BookOpen className="w-5 h-5" />} color="text-indigo-600" />
          <StatCard title="Hoàn thành" value={activities.filter((a) => a.course_id === selectedCourse && a.status === "done").length} icon={<CheckCircle className="w-5 h-5" />} color="text-emerald-600" />
        </div>
      </div>
    </main>
  );
}

function StatCard({ title, value, icon, color }: { title: string; value: number; icon: React.ReactNode; color: string }) {
  return (
    <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{title}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
        </div>
        <div className={`p-2.5 rounded-lg ${color} ${color === "text-blue-600" ? "bg-blue-50" : color === "text-indigo-600" ? "bg-indigo-50" : "bg-emerald-50"}`}>
          {icon}
        </div>
      </div>
    </div>
  );
}
