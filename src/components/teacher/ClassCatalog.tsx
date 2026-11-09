"use client";

import { useMemo, useState } from "react";
import { Plus, Users, Trash2, ChevronRight, RefreshCw, GraduationCap } from "lucide-react";

export type ClassItem = {
  id: string;
  name: string;
  grade_level: string | null;
  school_year: string | null;
  homeroom_teacher: string | null;
  created_at: string;
  updated_at: string;
  totalStudents: number;
  activeStudents: number;
};

export type ClassCatalogProps = {
  classes: ClassItem[];
  loading: boolean;
  loadError?: string;
  onReload: () => void;
  onCreate: (payload: { name: string; grade_level?: string; school_year?: string; homeroom_teacher?: string }) => Promise<void>;
  onDelete: (name: string) => Promise<void>;
  onOpenClass: (className: string) => void;
};

function smartSort(list: ClassItem[]) {
  return [...list].sort((a, b) => {
    const parse = (value: string) => {
      const match = value.trim().match(/^(\d{1,2})\s*([A-Za-z])?\s*(\d{0,3})$/i);
      if (match) return { grade: Number(match[1]) || 0, group: (match[2] || "").toUpperCase(), number: Number(match[3]) || 0, raw: value };
      return { grade: 0, group: "", number: 0, raw: value };
    };
    const left = parse(a.name);
    const right = parse(b.name);
    if (left.grade !== right.grade) return left.grade - right.grade;
    if (left.group !== right.group) return left.group.localeCompare(right.group, "vi");
    if (left.number !== right.number) return left.number - right.number;
    return left.raw.localeCompare(right.raw, "vi");
  });
}

export default function ClassCatalog({ classes, loading, loadError = "", onReload, onCreate, onDelete, onOpenClass }: ClassCatalogProps) {
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [gradeLevel, setGradeLevel] = useState("");
  const [schoolYear, setSchoolYear] = useState("");
  const [homeroom, setHomeroom] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const sorted = useMemo(() => smartSort(classes), [classes]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (saving) return;
    setError("");
    setSaving(true);
    try {
      await onCreate({ name, grade_level: gradeLevel, school_year: schoolYear, homeroom_teacher: homeroom });
      setCreating(false);
      setName(""); setGradeLevel(""); setSchoolYear(""); setHomeroom("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không tạo được lớp.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 w-full animate-in fade-in">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-3xl font-extrabold text-slate-900 flex items-center gap-2">
            <GraduationCap className="w-7 h-7 text-blue-600" /> Danh mục lớp học
          </h2>
          <p className="mt-1 text-sm text-slate-500">Tạo lớp, xem sỉ số và ngày thành lập. Bấm vào lớp để xem danh sách học sinh.</p>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={onReload} className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50"><RefreshCw className="h-4 w-4" /> Tải lại</button>
          <button type="button" onClick={() => setCreating((value) => !value)} className="inline-flex items-center gap-2 rounded-xl bg-blue-700 px-4 py-2.5 text-sm font-bold text-white hover:bg-blue-800"><Plus className="h-4 w-4" /> Tạo lớp mới</button>
        </div>
      </div>

      {loadError && (
        <div role="alert" className="rounded-2xl border border-rose-300 bg-rose-50 p-4 text-sm text-rose-900">
          <p className="font-bold">Không tải được danh mục lớp</p>
          <p className="mt-1 text-xs">{loadError}</p>
          {/classes|relation|does not exist|schema cache/i.test(loadError) && (
            <p className="mt-2 rounded-lg bg-white/70 p-2 text-xs">
              Gợi ý: bảng <code className="font-mono font-bold">classes</code> chưa tồn tại trên Supabase. Hãy chạy
              file <code className="font-mono font-bold">supabase/sql-editor/full_setup.sql</code> trong SQL Editor
              (đã bao gồm migration <code className="font-mono">20261104001300_classes_management.sql</code>), rồi bấm Tải lại.
            </p>
          )}
          <button type="button" onClick={onReload} className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-rose-600 px-3 py-2 text-xs font-bold text-white hover:bg-rose-700">
            <RefreshCw className="h-3.5 w-3.5" /> Thử tải lại
          </button>
        </div>
      )}

      {creating && (
        <form onSubmit={(event) => void submit(event)} className="rounded-2xl border border-blue-200 bg-blue-50/60 p-5 space-y-4">
          <h3 className="text-base font-extrabold text-slate-900">Tạo lớp mới</h3>
          <div className="grid gap-3 md:grid-cols-2">
            <label className="block text-xs font-bold text-slate-700">Tên lớp <span className="text-rose-600">*</span>
              <input value={name} onChange={(event) => setName(event.target.value)} maxLength={60} required placeholder="Ví dụ: 11A1" className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500" />
            </label>
            <label className="block text-xs font-bold text-slate-700">Khối
              <input value={gradeLevel} onChange={(event) => setGradeLevel(event.target.value)} maxLength={20} placeholder="Ví dụ: 11" className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500" />
            </label>
            <label className="block text-xs font-bold text-slate-700">Năm học
              <input value={schoolYear} onChange={(event) => setSchoolYear(event.target.value)} maxLength={20} placeholder="Ví dụ: 2025-2026" className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500" />
            </label>
            <label className="block text-xs font-bold text-slate-700">GVCN
              <input value={homeroom} onChange={(event) => setHomeroom(event.target.value)} maxLength={80} placeholder="Ví dụ: Cô Hương Xuân" className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500" />
            </label>
          </div>
          {error && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm font-semibold text-rose-800">{error}</p>}
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => { setCreating(false); setError(""); }} className="rounded-xl border px-4 py-2 text-sm font-semibold text-slate-600">Hủy</button>
            <button type="submit" disabled={saving} className="rounded-xl bg-blue-700 px-4 py-2 text-sm font-bold text-white hover:bg-blue-800 disabled:opacity-50">{saving ? "Đang tạo…" : "Tạo lớp"}</button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-400">Đang tải danh mục lớp…</div>
      ) : sorted.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">
          <GraduationCap className="mx-auto h-12 w-12 text-slate-300" />
          <p className="mt-3 text-sm font-semibold text-slate-600">Chưa có lớp nào.</p>
          <p className="mt-1 text-xs text-slate-400">Bấm &quot;Tạo lớp mới&quot; để bắt đầu.</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {sorted.map((item) => (
            <div key={item.id} className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:border-blue-300 hover:shadow-md">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="truncate text-lg font-extrabold text-slate-900">{item.name}</h3>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {item.grade_level ? `Khối ${item.grade_level} · ` : ""}{item.school_year || "Chưa có năm học"}
                  </p>
                </div>
                <button type="button" onClick={() => void onDelete(item.name)} aria-label={`Xóa lớp ${item.name}`} title="Xóa lớp" className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600"><Trash2 className="h-4 w-4" /></button>
              </div>
              <dl className="mt-4 space-y-1.5 text-xs text-slate-600">
                <div className="flex items-center justify-between"><dt>Sỉ số</dt><dd className="font-bold text-slate-900">{item.totalStudents} học sinh</dd></div>
                <div className="flex items-center justify-between"><dt>Đang học</dt><dd className="font-semibold text-emerald-700">{item.activeStudents}</dd></div>
                <div className="flex items-center justify-between"><dt>Ngày thành lập</dt><dd className="font-semibold">{item.created_at ? new Date(item.created_at).toLocaleDateString("vi-VN") : "—"}</dd></div>
                {item.homeroom_teacher && <div className="flex items-center justify-between"><dt>GVCN</dt><dd className="font-semibold">{item.homeroom_teacher}</dd></div>}
              </dl>
              <button type="button" onClick={() => onOpenClass(item.name)} className="mt-4 flex w-full items-center justify-between rounded-xl bg-blue-50 px-3.5 py-2.5 text-sm font-bold text-blue-700 transition-colors hover:bg-blue-100">
                <span className="inline-flex items-center gap-2"><Users className="h-4 w-4" /> Xem danh sách học sinh</span>
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
