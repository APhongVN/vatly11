"use client";

import { useCallback, useEffect, useState } from "react";
import { Download, RefreshCw, Search, Trash2 } from "lucide-react";
import { supabase } from "@/lib/supabase";

const ACTIVITY_TITLES: Record<number, string> = {
  1: "Xác định vấn đề bài học", 2: "Microteaching", 3: "Dự đoán và giả thuyết", 4: "Phòng thí nghiệm ảo",
  5: "Prediction–Evidence–Revision", 6: "Kiểm tra mức sẵn sàng", 7: "Peer Instruction", 8: "Các thí nghiệm liên quan đến tụ điện",
  12: "Luyện tập và vận dụng gần", 13: "Dự án thiết kế", 14: "Phản tư và luyện tập giãn cách",
};
type EvidenceRow = { id: string; activity_id: number; student_id: string; evidence: Record<string, unknown>; score: number | null; score_max: number | null; completed_at: string | null; updated_at: string; students?: { full_name?: string; class_name?: string } | null };

function EvidenceAttachments({ evidence }: { evidence: Record<string, unknown> }) {
  if (evidence.kind !== "project-submission" || !Array.isArray(evidence.attachments)) return null;
  const files = evidence.attachments.filter((item): item is { path: string; name: string; size: number } => Boolean(item) && typeof item === "object" && typeof (item as { path?: unknown }).path === "string" && typeof (item as { name?: unknown }).name === "string");
  if (!files.length) return null;
  return <div className="mt-3 flex flex-wrap gap-2">{files.map((file) => <a key={file.path} href={`/api/files?bucket=class-work&path=${encodeURIComponent(file.path)}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-lg border border-indigo-100 bg-white px-3 py-2 text-xs font-semibold text-indigo-800 hover:bg-indigo-50"><Download className="h-3.5 w-3.5"/>{file.name}</a>)}</div>;
}

export default function ActivityEvidencePanel({ previewMode = false }: { previewMode?: boolean }) {
  const [records, setRecords] = useState<EvidenceRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [activityFilter, setActivityFilter] = useState("all");
  const [lastUpdated, setLastUpdated] = useState("");

  const loadRecords = useCallback(async () => {
    if (previewMode) {
      setRecords([
        { id: "demo-evidence-1", activity_id: 4, student_id: "demo-student-1", evidence: { kind: "virtual-lab", stations: { "charge-voltage": { notes: { prediction: "Q tăng theo U.", evidence: "5 điểm đo gần tuyến tính.", conclusion: "C là hệ số góc Q=f(U)." }, measurements: [{ U: 1, Q: 8.8e-11 }, { U: 2, Q: 1.77e-10 }] } } }, score: null, score_max: null, completed_at: null, updated_at: new Date().toISOString(), students: { full_name: "Nguyễn Minh Anh", class_name: "11A1" } },
        { id: "demo-evidence-2", activity_id: 6, student_id: "demo-student-2", evidence: { kind: "quiz", answers: { R1: 1, R2: 1 } }, score: 8, score_max: 10, completed_at: new Date().toISOString(), updated_at: new Date().toISOString(), students: { full_name: "Trần Gia Bảo", class_name: "11A1" } },
      ]);
      return;
    }
    setLoading(true); setError("");
    const { data, error: queryError } = await supabase.from("activity_evidence")
      .select("id,activity_id,student_id,evidence,score,score_max,completed_at,updated_at,students(full_name,class_name)")
      .order("updated_at", { ascending: false }).limit(500);
    if (queryError) {
      setError("Chưa tải được hồ sơ. Hãy kiểm tra migration activity_evidence đã được áp dụng trên Supabase.");
    } else {
      setRecords((data || []) as unknown as EvidenceRow[]);
      setLastUpdated(new Date().toLocaleTimeString("vi-VN"));
    }
    setLoading(false);
  }, [previewMode]);

  useEffect(() => { void loadRecords(); }, [loadRecords]);

  const visible = records.filter((record) => {
    const name = record.students?.full_name || "";
    const matchesSearch = `${name} ${record.students?.class_name || ""}`.toLocaleLowerCase("vi").includes(search.toLocaleLowerCase("vi"));
    return matchesSearch && (activityFilter === "all" || String(record.activity_id) === activityFilter);
  });
  const deleteRecord = async (record: EvidenceRow) => {
    if (previewMode || !confirm(`Xóa hồ sơ hoạt động của ${record.students?.full_name || "học sinh này"}?`)) return;
    const { error: deleteError } = await supabase.from("activity_evidence").delete().eq("id", record.id);
    if (deleteError) { setError("Không xóa được hồ sơ. Hãy kiểm tra quyền giáo viên."); return; }
    setRecords((current) => current.filter((item) => item.id !== record.id));
  };

  const downloadExport = () => {
    const blob = new Blob([JSON.stringify(visible, null, 2)], { type: "application/json;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a"); anchor.href = url; anchor.download = "ho-so-hoat-dong-tu-dien.json"; anchor.click(); URL.revokeObjectURL(url);
  };

  return <section className="max-w-6xl space-y-5 animate-in fade-in">
    <header className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[.16em] text-blue-700">Học tập theo quá trình</p><h2 className="mt-1 text-3xl font-black text-slate-900">Sổ tay và bằng chứng hoạt động</h2><p className="mt-1 text-sm text-slate-500">Xem câu trả lời trước/sau thảo luận, dữ liệu đo và bài trắc nghiệm đã lưu.</p></div><div className="flex gap-2"><button type="button" onClick={() => void loadRecords()} disabled={loading} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700 disabled:opacity-50"><RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}/>Tải lại</button><button type="button" onClick={downloadExport} disabled={!visible.length} className="inline-flex items-center gap-2 rounded-xl bg-blue-700 px-3 py-2 text-sm font-bold text-white disabled:opacity-50"><Download className="h-4 w-4"/>Xuất JSON</button></div></header>
    {previewMode && <div className="rounded-xl border border-blue-100 bg-blue-50 p-3 text-xs text-blue-900">Dữ liệu minh họa để xem trước; đây không phải hồ sơ học sinh thật.</div>}
    {error && <div role="alert" className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">{error}</div>}
    <div className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 md:grid-cols-[1fr_220px_auto]"><label className="relative"><Search className="absolute left-3 top-3 h-4 w-4 text-slate-400"/><input value={search} onChange={(event)=>setSearch(event.target.value)} placeholder="Tìm học sinh hoặc lớp" className="w-full rounded-xl border py-2.5 pl-9 pr-3 text-sm"/></label><select value={activityFilter} onChange={(event)=>setActivityFilter(event.target.value)} className="rounded-xl border px-3 py-2 text-sm"><option value="all">Tất cả hoạt động</option>{Object.entries(ACTIVITY_TITLES).map(([id,title])=><option key={id} value={id}>Bài {id}: {title}</option>)}</select><p className="self-center text-xs text-slate-500">{visible.length} hồ sơ · {lastUpdated ? `cập nhật ${lastUpdated}` : ""}</p></div>
    <div className="space-y-3">{loading && <p className="rounded-xl bg-white p-8 text-center text-sm text-slate-500">Đang tải hồ sơ…</p>}{!loading && visible.length===0 && <p className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-500">{error ? "Hồ sơ chưa sẵn sàng." : "Chưa có học sinh lưu hồ sơ hoạt động."}</p>}{visible.map((record)=><article key={record.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="font-bold text-slate-900">{record.students?.full_name || "Học sinh"} <span className="font-normal text-slate-500">· {record.students?.class_name || "Chưa có lớp"}</span></p><p className="mt-1 text-sm text-blue-800">Bài {record.activity_id}: {ACTIVITY_TITLES[record.activity_id] || "Hoạt động"}</p></div><div className="flex items-start gap-3"><div className="text-right text-xs text-slate-500">{record.score !== null ? <p className="font-bold text-emerald-700">Điểm {record.score}/{record.score_max}</p> : <p>{record.completed_at ? "Đã nộp" : "Đang lưu tiến độ"}</p>}<p>{new Date(record.updated_at).toLocaleString("vi-VN")}</p></div>{!previewMode && <button type="button" aria-label={`Xóa hồ sơ của ${record.students?.full_name || "học sinh"}`} onClick={() => void deleteRecord(record)} className="rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-700"><Trash2 className="h-4 w-4"/></button>}</div></div><EvidenceAttachments evidence={record.evidence}/><details className="mt-3 rounded-xl bg-slate-50 p-3"><summary className="cursor-pointer text-xs font-bold text-slate-700">Mở toàn bộ câu trả lời và số liệu</summary><pre className="mt-3 max-h-96 overflow-auto whitespace-pre-wrap break-words text-xs leading-5 text-slate-700">{JSON.stringify(record.evidence, null, 2)}</pre></details></article>)}</div>
  </section>;
}
