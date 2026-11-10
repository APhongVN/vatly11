"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { ACTIVITIES } from "@/lib/data/activities";
import {
  BookOpen,
  ChevronDown,
  ChevronRight,
  CirclePlus,
  FilePenLine,
  FolderPlus,
  Layers3,
  LoaderCircle,
  Pencil,
  Save,
  Trash2,
} from "lucide-react";

type Course = {
  id: string;
  title: string;
  description: string | null;
  grade_level: number | null;
  subject: string | null;
};

type Chapter = {
  id: string;
  course_id: string | null;
  title: string;
  description: string | null;
};

type CurriculumActivity = {
  id: number;
  title: string;
  status: string | null;
  course_id: string | null;
  chapter_id: string | null;
};

const previewCourse: Course = {
  id: "11111111-1111-4111-8111-111111111111",
  title: "Vật lí",
  description: "Chương trình mẫu đang xem trước.",
  grade_level: 11,
  subject: "Vật lí",
};

const previewChapter: Chapter = {
  id: "44444444-4444-4444-8444-444444444444",
  course_id: previewCourse.id,
  title: "Chuyên đề Tụ điện",
  description: "14 mục nguồn, trong đó các mục 8–11 đã được gộp thành một hoạt động thí nghiệm.",
};

const previewActivities: CurriculumActivity[] = ACTIVITIES.map((activity) => ({
  id: activity.id,
  title: activity.title,
  status: activity.status,
  course_id: previewCourse.id,
  chapter_id: previewChapter.id,
}));

function shortText(value: string | null) {
  const text = value?.trim() || "";
  return text.length > 170 ? `${text.slice(0, 167)}…` : text;
}

function PublishPill({ status }: { status: string | null }) {
  const visible = status === "available";
  return <span className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-bold ${visible ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>{visible ? "Đang mở" : "Bản nháp / khóa"}</span>;
}

/**
 * The content tree is intentionally separate from the giant teacher dashboard.
 * It is the single place where a teacher creates the course/chapter shell and
 * assigns activities, so a newly-created lesson cannot be left ungrouped.
 */
export default function CurriculumManager({ previewMode = false }: { previewMode?: boolean }) {
  const [courses, setCourses] = useState<Course[]>(previewMode ? [previewCourse] : []);
  const [chapters, setChapters] = useState<Chapter[]>(previewMode ? [previewChapter] : []);
  const [activities, setActivities] = useState<CurriculumActivity[]>(previewMode ? previewActivities : []);
  const [selectedCourseId, setSelectedCourseId] = useState(previewCourse.id);
  const [expandedCourseId, setExpandedCourseId] = useState(previewCourse.id);
  const [newCourseTitle, setNewCourseTitle] = useState("");
  const [newCourseDescription, setNewCourseDescription] = useState("");
  const [newCourseGrade, setNewCourseGrade] = useState("11");
  const [newCourseSubject, setNewCourseSubject] = useState("Vật lí");
  const [newChapterTitle, setNewChapterTitle] = useState("");
  const [newChapterDescription, setNewChapterDescription] = useState("");
  const [editingCourseId, setEditingCourseId] = useState<string | null>(null);
  const [editingChapterId, setEditingChapterId] = useState<string | null>(null);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(!previewMode);
  const [saving, setSaving] = useState(false);

  const refresh = useCallback(async () => {
    if (previewMode) {
      setCourses([previewCourse]);
      setChapters([previewChapter]);
      setActivities(previewActivities);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError("");
    const [{ data: courseRows, error: courseError }, { data: chapterRows, error: chapterError }, { data: activityRows, error: activityError }] = await Promise.all([
      supabase.from("courses").select("id,title,description,grade_level,subject").order("grade_level").order("title").limit(200),
      supabase.from("chapters").select("id,course_id,title,description").order("created_at").limit(500),
      supabase.from("activities").select("id,title,status,course_id,chapter_id").order("id").limit(500),
    ]);
    if (courseError || chapterError || activityError) {
      setError("Chưa tải được cây nội dung. Hãy áp dụng migration và đăng nhập bằng tài khoản giáo viên để quản lý dữ liệu.");
    } else {
      const nextCourses = (courseRows || []) as Course[];
      setCourses(nextCourses);
      setChapters((chapterRows || []) as Chapter[]);
      setActivities((activityRows || []) as CurriculumActivity[]);
      if (nextCourses.length) setSelectedCourseId((current) => nextCourses.some((course) => course.id === current) ? current : nextCourses[0].id);
      if (nextCourses.length) setExpandedCourseId((current) => nextCourses.some((course) => course.id === current) ? current : nextCourses[0].id);
    }
    setLoading(false);
  }, [previewMode]);

  useEffect(() => { void refresh(); }, [refresh]);

  const selectedCourse = courses.find((course) => course.id === selectedCourseId) || null;
  const selectedCourseChapters = useMemo(
    () => chapters.filter((chapter) => chapter.course_id === selectedCourseId),
    [chapters, selectedCourseId],
  );
  const unassignedActivities = useMemo(
    () => activities.filter((activity) => !activity.course_id || !activity.chapter_id),
    [activities],
  );

  const resetMessages = () => { setError(""); setNotice(""); };
  const finish = async (message: string) => {
    setNotice(message);
    await refresh();
  };

  const addCourse = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!newCourseTitle.trim() || saving) return;
    const grade = Number(newCourseGrade);
    if (!Number.isInteger(grade) || grade < 1 || grade > 12) { setError("Khối lớp phải là số nguyên từ 1 đến 12."); return; }
    if (previewMode) {
      const id = `preview-course-${Date.now()}`;
      const course: Course = { id, title: newCourseTitle.trim(), description: newCourseDescription.trim() || null, grade_level: grade, subject: newCourseSubject.trim() || null };
      setCourses((current) => [...current, course]); setSelectedCourseId(id); setExpandedCourseId(id);
      setNewCourseTitle(""); setNewCourseDescription(""); setNotice("Đã thêm môn học trong phiên xem trước.");
      return;
    }
    setSaving(true); resetMessages();
    const { data, error: createError } = await supabase.from("courses").insert({
      title: newCourseTitle.trim(), description: newCourseDescription.trim() || null,
      grade_level: grade, subject: newCourseSubject.trim() || null,
    }).select("id").single();
    if (createError || !data) setError(`Không tạo được môn học: ${createError?.message || "Máy chủ chưa trả mã môn học."}`);
    else {
      setNewCourseTitle(""); setNewCourseDescription("");
      setSelectedCourseId(data.id); setExpandedCourseId(data.id);
      await finish("Đã tạo môn học. Có thể thêm chương ngay bên dưới.");
    }
    setSaving(false);
  };

  const addChapter = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedCourseId || !newChapterTitle.trim() || saving) return;
    if (previewMode) {
      const chapter: Chapter = { id: `preview-chapter-${Date.now()}`, course_id: selectedCourseId, title: newChapterTitle.trim(), description: newChapterDescription.trim() || null };
      setChapters((current) => [...current, chapter]); setNewChapterTitle(""); setNewChapterDescription(""); setNotice("Đã thêm chương trong phiên xem trước.");
      return;
    }
    setSaving(true); resetMessages();
    const { error: createError } = await supabase.from("chapters").insert({
      course_id: selectedCourseId, title: newChapterTitle.trim(), description: newChapterDescription.trim() || null,
    });
    if (createError) setError(`Không tạo được chương: ${createError.message}`);
    else { setNewChapterTitle(""); setNewChapterDescription(""); await finish("Đã thêm chương. Các bài có thể được gán vào chương này."); }
    setSaving(false);
  };

  const saveCourse = async (event: React.FormEvent<HTMLFormElement>, course: Course) => {
    event.preventDefault();
    if (saving) return;
    const values = new FormData(event.currentTarget);
    const title = String(values.get("title") || "").trim();
    const grade = Number(values.get("grade_level"));
    if (!title || !Number.isInteger(grade) || grade < 1 || grade > 12) { setError("Tên môn và khối lớp 1–12 là bắt buộc."); return; }
    if (previewMode) {
      setCourses((current) => current.map((item) => item.id === course.id ? { ...item, title, description: String(values.get("description") || "").trim() || null, grade_level: grade, subject: String(values.get("subject") || "").trim() || null } : item));
      setEditingCourseId(null); setNotice("Đã lưu thay đổi môn học trong phiên xem trước.");
      return;
    }
    setSaving(true); resetMessages();
    const { error: updateError } = await supabase.from("courses").update({
      title, description: String(values.get("description") || "").trim() || null,
      grade_level: grade, subject: String(values.get("subject") || "").trim() || null,
    }).eq("id", course.id);
    if (updateError) setError(`Không lưu được môn học: ${updateError.message}`);
    else { setEditingCourseId(null); await finish("Đã lưu thay đổi môn học."); }
    setSaving(false);
  };

  const saveChapter = async (event: React.FormEvent<HTMLFormElement>, chapter: Chapter) => {
    event.preventDefault();
    if (saving) return;
    const values = new FormData(event.currentTarget);
    const title = String(values.get("title") || "").trim();
    if (!title) { setError("Tên chương không được để trống."); return; }
    if (previewMode) {
      setChapters((current) => current.map((item) => item.id === chapter.id ? { ...item, title, description: String(values.get("description") || "").trim() || null } : item));
      setEditingChapterId(null); setNotice("Đã lưu thay đổi chương trong phiên xem trước.");
      return;
    }
    setSaving(true); resetMessages();
    const { error: updateError } = await supabase.from("chapters").update({
      title, description: String(values.get("description") || "").trim() || null,
    }).eq("id", chapter.id);
    if (updateError) setError(`Không lưu được chương: ${updateError.message}`);
    else { setEditingChapterId(null); await finish("Đã lưu thay đổi chương."); }
    setSaving(false);
  };

  const deleteCourse = async (course: Course) => {
    if (previewMode) {
      setCourses((current) => current.filter((item) => item.id !== course.id));
      setChapters((current) => current.map((item) => item.course_id === course.id ? { ...item, course_id: null } : item));
      setActivities((current) => current.map((item) => item.course_id === course.id ? { ...item, course_id: null, chapter_id: null } : item));
      if (selectedCourseId === course.id) setSelectedCourseId("");
      setNotice("Đã xóa môn học trong phiên xem trước; các bài vẫn được giữ để gán lại.");
      return;
    }
    if (saving || !window.confirm(`Xóa môn “${course.title}”? Chương và bài hiện có sẽ không bị xóa, nhưng sẽ trở thành chưa gán.`)) return;
    setSaving(true); resetMessages();
    const { error: deleteError } = await supabase.from("courses").delete().eq("id", course.id);
    if (deleteError) setError(`Không xóa được môn học: ${deleteError.message}`);
    else { if (course.id === selectedCourseId) setSelectedCourseId(""); await finish("Đã xóa môn học; nội dung bên trong vẫn được giữ để gán lại."); }
    setSaving(false);
  };

  const deleteChapter = async (chapter: Chapter) => {
    if (previewMode) {
      setChapters((current) => current.filter((item) => item.id !== chapter.id));
      setActivities((current) => current.map((item) => item.chapter_id === chapter.id ? { ...item, chapter_id: null } : item));
      setNotice("Đã xóa chương trong phiên xem trước; các bài vẫn được giữ để gán lại.");
      return;
    }
    if (saving || !window.confirm(`Xóa chương “${chapter.title}”? Các bài trong chương vẫn được giữ, nhưng sẽ trở thành chưa gán.`)) return;
    setSaving(true); resetMessages();
    const { error: deleteError } = await supabase.from("chapters").delete().eq("id", chapter.id);
    if (deleteError) setError(`Không xóa được chương: ${deleteError.message}`);
    else await finish("Đã xóa chương; các bài bên trong vẫn nằm trong danh sách chưa gán.");
    setSaving(false);
  };

  const assignActivity = async (activity: CurriculumActivity, chapterId: string) => {
    if (saving || !selectedCourseId) return;
    const chapter = chapters.find((item) => item.id === chapterId);
    if (!chapter || chapter.course_id !== selectedCourseId) { setError("Chương được chọn không thuộc môn học hiện tại."); return; }
    if (previewMode) {
      setActivities((current) => current.map((item) => item.id === activity.id ? { ...item, course_id: selectedCourseId, chapter_id: chapterId } : item));
      setNotice(`Đã đặt “${activity.title}” vào chương “${chapter.title}” trong phiên xem trước.`);
      return;
    }
    setSaving(true); resetMessages();
    const { error: updateError } = await supabase.from("activities").update({ course_id: selectedCourseId, chapter_id: chapterId }).eq("id", activity.id);
    if (updateError) setError(`Không gán được bài “${activity.title}”: ${updateError.message}`);
    else await finish(`Đã đặt “${activity.title}” vào chương “${chapter.title}”.`);
    setSaving(false);
  };

  if (loading) return <div className="flex min-h-72 items-center justify-center rounded-3xl border border-slate-200 bg-white text-sm text-slate-500"><LoaderCircle className="mr-2 h-5 w-5 animate-spin" /> Đang tải lộ trình học…</div>;

  return <div className="mx-auto max-w-7xl space-y-6 pb-10">
    <header className="flex flex-col justify-between gap-4 rounded-3xl bg-gradient-to-br from-slate-950 via-indigo-950 to-blue-900 p-6 text-white shadow-xl md:flex-row md:items-end md:p-8">
      <div><p className="mb-2 text-xs font-bold uppercase tracking-[.18em] text-indigo-200">Cấu trúc mở rộng</p><h1 className="text-3xl font-black md:text-4xl">Lộ trình môn học</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-blue-100">Tạo môn, chương và đặt từng bài học vào đúng vị trí. Cây này là nền tảng để mở rộng từ bài mẫu Tụ điện sang nhiều chương và nguồn tài liệu khác.</p></div>
      <div className="flex gap-3"><div className="rounded-2xl border border-white/15 bg-white/10 px-4 py-3"><b className="block text-2xl">{courses.length}</b><span className="text-xs text-blue-100">môn học</span></div><div className="rounded-2xl border border-white/15 bg-white/10 px-4 py-3"><b className="block text-2xl">{chapters.length}</b><span className="text-xs text-blue-100">chương</span></div><div className="rounded-2xl border border-white/15 bg-white/10 px-4 py-3"><b className="block text-2xl">{activities.length}</b><span className="text-xs text-blue-100">bài học</span></div></div>
    </header>

    {previewMode && <p className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">Đây là lộ trình mẫu ở chế độ xem tự do. Sau khi mở tài khoản giáo viên và áp dụng migration, mọi nút thêm/sửa/xóa sẽ lưu vào Supabase.</p>}
    {(error || notice) && <p role={error ? "alert" : "status"} className={`rounded-2xl border px-4 py-3 text-sm ${error ? "border-rose-200 bg-rose-50 text-rose-800" : "border-emerald-200 bg-emerald-50 text-emerald-800"}`}>{error || notice}</p>}

    <div className="grid gap-6 xl:grid-cols-[minmax(290px,.72fr)_minmax(0,1.28fr)]">
      <aside className="space-y-5 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
        <section>
          <div className="mb-3 flex items-center gap-2"><CirclePlus className="h-5 w-5 text-blue-700" /><h2 className="font-bold text-slate-900">Thêm môn học</h2></div>
          <form onSubmit={(event) => void addCourse(event)} className="space-y-3">
            <input value={newCourseTitle} onChange={(event) => setNewCourseTitle(event.target.value)} disabled={saving} maxLength={160} required placeholder="Ví dụ: Vật lí 12" className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-500 disabled:bg-slate-100" />
            <div className="grid grid-cols-2 gap-2"><input value={newCourseSubject} onChange={(event) => setNewCourseSubject(event.target.value)} disabled={saving} maxLength={80} placeholder="Môn học" className="min-w-0 rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-500 disabled:bg-slate-100" /><input value={newCourseGrade} onChange={(event) => setNewCourseGrade(event.target.value)} disabled={saving} inputMode="numeric" maxLength={2} required placeholder="Khối" className="min-w-0 rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-500 disabled:bg-slate-100" /></div>
            <textarea value={newCourseDescription} onChange={(event) => setNewCourseDescription(event.target.value)} disabled={saving} maxLength={1000} placeholder="Mô tả môn học (không bắt buộc)" className="min-h-20 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-500 disabled:bg-slate-100" />
            <button type="submit" disabled={saving} className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-700 px-4 py-2.5 text-sm font-bold text-white hover:bg-blue-800 disabled:bg-slate-300"><FolderPlus className="h-4 w-4" /> Tạo môn học</button>
          </form>
        </section>
        <section className="border-t border-slate-100 pt-5">
          <div className="mb-3 flex items-center gap-2"><Layers3 className="h-5 w-5 text-indigo-700" /><h2 className="font-bold text-slate-900">Thêm chương</h2></div>
          <form onSubmit={(event) => void addChapter(event)} className="space-y-3">
            <select value={selectedCourseId} onChange={(event) => { setSelectedCourseId(event.target.value); setExpandedCourseId(event.target.value); }} disabled={saving || !courses.length} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500 disabled:bg-slate-100"><option value="">Chọn môn học</option>{courses.map((course) => <option key={course.id} value={course.id}>{course.subject ? `${course.subject} · ` : ""}{course.title}</option>)}</select>
            <input value={newChapterTitle} onChange={(event) => setNewChapterTitle(event.target.value)} disabled={saving || !selectedCourseId} maxLength={180} required placeholder="Ví dụ: Chương 2 · Sóng cơ" className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-500 disabled:bg-slate-100" />
            <textarea value={newChapterDescription} onChange={(event) => setNewChapterDescription(event.target.value)} disabled={saving || !selectedCourseId} maxLength={1000} placeholder="Mục tiêu / giới thiệu chương" className="min-h-20 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-500 disabled:bg-slate-100" />
            <button type="submit" disabled={saving || !selectedCourseId} className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-700 px-4 py-2.5 text-sm font-bold text-white hover:bg-indigo-800 disabled:bg-slate-300"><CirclePlus className="h-4 w-4" /> Thêm chương</button>
          </form>
        </section>
      </aside>

      <div className="space-y-4">
        {courses.length === 0 && <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-500"><BookOpen className="mx-auto mb-3 h-8 w-8 text-slate-300" />Chưa có môn học. Tạo môn học đầu tiên ở cột bên trái.</div>}
        {courses.map((course) => {
          const courseChapters = chapters.filter((chapter) => chapter.course_id === course.id);
          const courseActivities = activities.filter((activity) => activity.course_id === course.id);
          const expanded = expandedCourseId === course.id;
          return <section key={course.id} className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-start gap-3 p-5 md:p-6">
              <button type="button" onClick={() => setExpandedCourseId(expanded ? "" : course.id)} className="mt-0.5 rounded-xl border border-slate-200 p-2 text-slate-600 hover:bg-slate-50" aria-label={`${expanded ? "Thu gọn" : "Mở"} ${course.title}`}>{expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}</button>
              <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h2 className="text-lg font-black text-slate-900">{course.title}</h2><span className="rounded-full bg-blue-50 px-2 py-1 text-[10px] font-bold text-blue-700">{course.subject || "Chưa phân môn"} · Khối {course.grade_level || "?"}</span></div><p className="mt-1 text-sm leading-6 text-slate-500">{shortText(course.description) || "Chưa có mô tả môn học."}</p><p className="mt-2 text-xs font-semibold text-slate-500">{courseChapters.length} chương · {courseActivities.length} bài đã gán</p></div>
              <div className="flex shrink-0 gap-1"><button type="button" disabled={saving} onClick={() => setEditingCourseId(editingCourseId === course.id ? null : course.id)} className="rounded-lg p-2 text-slate-500 hover:bg-blue-50 hover:text-blue-700 disabled:text-slate-300" aria-label={`Sửa ${course.title}`}><Pencil className="h-4 w-4" /></button><button type="button" disabled={saving} onClick={() => void deleteCourse(course)} className="rounded-lg p-2 text-slate-500 hover:bg-rose-50 hover:text-rose-700 disabled:text-slate-300" aria-label={`Xóa ${course.title}`}><Trash2 className="h-4 w-4" /></button></div>
            </div>
            {editingCourseId === course.id && <form onSubmit={(event) => void saveCourse(event, course)} className="grid gap-3 border-t border-slate-100 bg-slate-50 p-5 md:grid-cols-2"><input name="title" defaultValue={course.title} maxLength={160} required className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500" /><input name="subject" defaultValue={course.subject || ""} maxLength={80} placeholder="Môn học" className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500" /><input name="grade_level" type="number" defaultValue={course.grade_level || 11} min="1" max="12" required className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500" /><textarea name="description" defaultValue={course.description || ""} maxLength={1000} placeholder="Mô tả môn học" className="min-h-20 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500" /><div className="md:col-span-2 flex justify-end gap-2"><button type="button" onClick={() => setEditingCourseId(null)} className="rounded-xl px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-200">Hủy</button><button type="submit" disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-blue-700 px-4 py-2 text-xs font-bold text-white hover:bg-blue-800"><Save className="h-4 w-4" /> Lưu môn học</button></div></form>}
            {expanded && <div className="border-t border-slate-100 bg-slate-50/60 p-4 md:p-5"><div className="space-y-3">{courseChapters.length === 0 && <p className="rounded-2xl border border-dashed border-slate-300 bg-white px-4 py-6 text-center text-sm text-slate-500">Chưa có chương nào. Chọn môn này ở cột trái để thêm chương.</p>}{courseChapters.map((chapter) => { const chapterActivities = activities.filter((activity) => activity.chapter_id === chapter.id); return <article key={chapter.id} className="rounded-2xl border border-slate-200 bg-white p-4"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h3 className="font-bold text-slate-900">{chapter.title}</h3><span className="text-xs text-slate-500">{chapterActivities.length} bài</span></div><p className="mt-1 text-xs leading-5 text-slate-500">{shortText(chapter.description) || "Chưa có mô tả chương."}</p></div><div className="flex gap-1"><button type="button" disabled={saving} onClick={() => setEditingChapterId(editingChapterId === chapter.id ? null : chapter.id)} className="rounded-lg p-2 text-slate-500 hover:bg-blue-50 hover:text-blue-700 disabled:text-slate-300" aria-label={`Sửa ${chapter.title}`}><FilePenLine className="h-4 w-4" /></button><button type="button" disabled={saving} onClick={() => void deleteChapter(chapter)} className="rounded-lg p-2 text-slate-500 hover:bg-rose-50 hover:text-rose-700 disabled:text-slate-300" aria-label={`Xóa ${chapter.title}`}><Trash2 className="h-4 w-4" /></button></div></div>{editingChapterId === chapter.id && <form onSubmit={(event) => void saveChapter(event, chapter)} className="mt-3 grid gap-2 sm:grid-cols-[1fr_auto]"><input name="title" defaultValue={chapter.title} maxLength={180} required className="rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500" /><div className="flex gap-2"><button type="button" onClick={() => setEditingChapterId(null)} className="rounded-xl px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100">Hủy</button><button type="submit" disabled={saving} className="rounded-xl bg-blue-700 px-3 py-2 text-xs font-bold text-white hover:bg-blue-800">Lưu</button></div><textarea name="description" defaultValue={chapter.description || ""} maxLength={1000} placeholder="Mô tả chương" className="min-h-20 sm:col-span-2 rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500" /></form>}<div className="mt-3 space-y-2 border-t border-slate-100 pt-3">{chapterActivities.length === 0 ? <p className="text-xs text-slate-400">Chưa có bài trong chương này.</p> : chapterActivities.map((activity) => <div key={activity.id} className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2"><BookOpen className="h-4 w-4 shrink-0 text-blue-600" /><p className="min-w-0 flex-1 truncate text-xs font-semibold text-slate-700">#{activity.id} · {activity.title}</p><PublishPill status={activity.status} /></div>)}</div></article>; })}</div></div>}
          </section>;
        })}

        <section className="rounded-3xl border border-amber-200 bg-amber-50/50 p-5 shadow-sm"><div className="flex items-start gap-3"><BookOpen className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" /><div className="min-w-0 flex-1"><h2 className="font-bold text-amber-950">Bài học chưa gán vào lộ trình</h2><p className="mt-1 text-xs leading-5 text-amber-800">Mỗi bài nên nằm trong một môn và một chương để học sinh thấy đúng thứ tự. Chọn môn ở cột trái, rồi đặt bài vào chương tương ứng.</p>{unassignedActivities.length === 0 ? <p className="mt-3 text-sm font-semibold text-emerald-700">Tất cả bài học đã được gán vào lộ trình.</p> : <div className="mt-3 space-y-2">{unassignedActivities.map((activity) => <div key={activity.id} className="flex flex-col gap-2 rounded-xl border border-amber-200 bg-white p-3 sm:flex-row sm:items-center"><p className="min-w-0 flex-1 truncate text-sm font-semibold text-slate-800">#{activity.id} · {activity.title}</p><select disabled={saving || !selectedCourseChapters.length} defaultValue="" onChange={(event) => { if (event.target.value) void assignActivity(activity, event.target.value); }} className="rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs outline-none focus:border-blue-500 disabled:bg-slate-100"><option value="">Gán vào chương…</option>{selectedCourseChapters.map((chapter) => <option key={chapter.id} value={chapter.id}>{selectedCourse?.title || "Môn"} · {chapter.title}</option>)}</select></div>)}</div>}</div></div></section>
      </div>
    </div>
  </div>;
}
