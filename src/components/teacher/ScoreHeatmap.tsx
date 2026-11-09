"use client";

import { useMemo, useState } from "react";
import { Download, Users } from "lucide-react";

type StudentRow = {
  id: string;
  full_name: string;
  class_name?: string | null;
};
type ActivityCol = { id: number; title: string };
type ScoreCell = number | null;

type ScoreHeatmapProps = {
  students: StudentRow[];
  activities: ActivityCol[];
  /** scores[studentId][activityId] = điểm 0-10 hoặc null (chưa làm) */
  scores: Record<string, Record<number, ScoreCell>>;
};

/**
 * Bảng điểm trực quan (heatmap): dòng = học sinh, cột = hoạt động.
 * Màu ô theo điểm: xanh >=8, vàng >=5, đỏ <5, xám = chưa làm.
 * Cô nhìn một cột là thấy ai yếu bài nào; có nút sao chép TSV (dán Excel).
 */
export default function ScoreHeatmap({ students, activities, scores }: ScoreHeatmapProps) {
  const [filterClass, setFilterClass] = useState("");
  const [copyDone, setCopyDone] = useState(false);

  const classes = useMemo(
    () => Array.from(new Set(students.map((s) => s.class_name || "Chưa xếp lớp"))).sort((a, b) => a.localeCompare(b, "vi")),
    [students],
  );
  const visibleStudents = useMemo(
    () => (filterClass ? students.filter((s) => (s.class_name || "Chưa xếp lớp") === filterClass) : students),
    [students, filterClass],
  );

  const cellClass = (score: ScoreCell) => {
    if (score === null) return "bg-slate-100 text-slate-400";
    if (score >= 8) return "bg-emerald-200 text-emerald-900";
    if (score >= 5) return "bg-amber-200 text-amber-900";
    return "bg-rose-200 text-rose-900";
  };

  const copyToClipboard = async () => {
    const header = ["Họ tên", "Lớp", ...activities.map((a) => `Bài ${a.id}: ${a.title}`)].join("\t");
    const rows = visibleStudents.map((s) => {
      const cells = activities.map((a) => {
        const score = scores[s.id]?.[a.id];
        return score === null || score === undefined ? "Chưa làm" : String(score);
      });
      return [s.full_name, s.class_name || "", ...cells].join("\t");
    });
    const tsv = [header, ...rows].join("\n");
    try {
      await navigator.clipboard.writeText(tsv);
      setCopyDone(true);
      setTimeout(() => setCopyDone(false), 2000);
    } catch {
      /* clipboard bị chặn bởi trình duyệt — bỏ qua */
    }
  };

  if (!students.length || !activities.length) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center">
        <Users className="mx-auto h-8 w-8 text-slate-300" />
        <p className="mt-2 text-xs text-slate-400">Chưa có đủ dữ liệu học sinh + bài tập để vẽ bảng điểm.</p>
      </div>
    );
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-extrabold text-slate-900">Bảng điểm trực quan lớp</h3>
          <p className="text-xs text-slate-500">Ô màu theo điểm: xanh ≥8 · vàng ≥5 · đỏ &lt;5 · xám = chưa làm. Nhìn một cột là thấy ai yếu bài nào.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select value={filterClass} onChange={(e) => setFilterClass(e.target.value)} aria-label="Lọc theo lớp" className="rounded-xl border border-slate-300 bg-white px-2.5 py-2 text-xs font-semibold">
            <option value="">Tất cả lớp</option>
            {classes.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <button type="button" onClick={() => void copyToClipboard()} className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50">
            <Download className="h-3.5 w-3.5" /> {copyDone ? "Đã sao chép ✓" : "Sao chép (Excel)"}
          </button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200">
        <table className="min-w-full text-xs">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="sticky left-0 bg-slate-50 px-3 py-2 text-left font-bold">Học sinh</th>
              <th className="px-2 py-2 text-center font-bold">Lớp</th>
              {activities.map((a) => (
                <th key={a.id} className="min-w-[64px] px-2 py-2 text-center font-bold" title={a.title}>Bài {a.id}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visibleStudents.map((s) => (
              <tr key={s.id} className="border-t border-slate-100 hover:bg-slate-50/60">
                <td className="sticky left-0 max-w-[180px] truncate bg-white px-3 py-2 font-semibold text-slate-800" title={s.full_name}>{s.full_name}</td>
                <td className="px-2 py-2 text-center text-slate-500">{s.class_name || "—"}</td>
                {activities.map((a) => {
                  const score = scores[s.id]?.[a.id] ?? null;
                  return (
                    <td key={a.id} className="px-2 py-2 text-center">
                      <span className={`inline-block min-w-[42px] rounded-md px-2 py-1 font-bold ${cellClass(score)}`} title={score === null ? "Chưa làm" : `Bài ${a.id}: ${score}/10`}>
                        {score === null ? "·" : score}
                      </span>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-3 flex flex-wrap gap-3 text-[11px] text-slate-500">
        <span className="inline-flex items-center gap-1.5"><span className="h-3 w-3 rounded bg-emerald-200" /> ≥8</span>
        <span className="inline-flex items-center gap-1.5"><span className="h-3 w-3 rounded bg-amber-200" /> 5–7.9</span>
        <span className="inline-flex items-center gap-1.5"><span className="h-3 w-3 rounded bg-rose-200" /> &lt;5</span>
        <span className="inline-flex items-center gap-1.5"><span className="h-3 w-3 rounded bg-slate-200" /> chưa làm</span>
        <span className="ml-auto">Bấm &quot;Sao chép (Excel)&quot; rồi dán vào bảng tính để gửi phụ huynh.</span>
      </div>
    </section>
  );
}