"use client";

import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Download, FileUp, LoaderCircle, Save, Trash2 } from "lucide-react";
import { supabase } from "@/lib/supabase";

type Attachment = { path: string; name: string; size: number; type: string };
type ProjectEvidence = { kind: "project-submission"; responses: Record<string, string>; projectLink: string; attachments: Attachment[] };
const FIELDS = [
  { key: "constraints", label: "1 · Phân tích yêu cầu", prompt: "Nêu điện áp làm việc, năng lượng tối thiểu và các ràng buộc cần thỏa mãn." },
  { key: "proposal", label: "2 · Phương án thiết kế", prompt: "Chọn tụ hoặc cách ghép; mô tả sơ đồ và cực tính/kết nối ở mức mô hình." },
  { key: "calculations", label: "3 · Tính toán và kiểm tra", prompt: "Trình bày Ceq, điện áp trên từng tụ, kiểm tra Umax và tính W có đơn vị." },
  { key: "comparison", label: "4 · Lập luận và phương án so sánh", prompt: "Vì sao phương án đáp ứng yêu cầu? So sánh với ít nhất một phương án khác." },
  { key: "limits", label: "5 · Giới hạn của mô hình", prompt: "Nêu ít nhất hai yếu tố thực tế mô hình lí tưởng chưa xét, ví dụ ESR, rò, dung sai hoặc hiệu suất." },
  { key: "sources", label: "6 · Nguồn và phân công", prompt: "Ghi nguồn hình/tài liệu đã dùng và vai trò đóng góp của thành viên nhóm." },
];
const MAX_FILE_BYTES = 25 * 1024 * 1024;
const ACCEPTED_EXTENSIONS = new Set(["pdf", "doc", "docx", "ppt", "pptx", "png", "jpg", "jpeg", "webp", "mp4", "webm"]);
const ACCEPT = ".pdf,.doc,.docx,.ppt,.pptx,.png,.jpg,.jpeg,.webp,.mp4,.webm";
const INITIAL: ProjectEvidence = { kind: "project-submission", responses: {}, projectLink: "", attachments: [] };
function humanSize(size: number) { return `${(size / 1024 / 1024).toFixed(1)} MB`; }

export default function ProjectSubmissionForm() {
  const [project, setProject] = useState<ProjectEvidence>(INITIAL);
  const [files, setFiles] = useState<File[]>([]);
  const [preview, setPreview] = useState(false);
  const [readOnly, setReadOnly] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    let active = true;
    fetch("/api/activity-evidence?activityId=13", { cache: "no-store" }).then(async (response) => {
      if (response.status === 401) { if (active) setPreview(true); return null; }
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Không tải được bài dự án đã lưu.");
      return result.record;
    }).then((record) => {
      if (!active || record?.evidence?.kind !== "project-submission") return;
      setProject({ ...INITIAL, ...record.evidence, responses: record.evidence.responses || {}, attachments: record.evidence.attachments || [] });
      setReadOnly(Boolean(record.completed_at));
    }).catch((loadError: unknown) => { if (active) setError(loadError instanceof Error ? loadError.message : "Không tải được bài dự án."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const ready = useMemo(() => FIELDS.every(({ key }) => (project.responses[key] || "").trim().length >= 10)
    && (project.attachments.length + files.length > 0 || project.projectLink.trim().length > 0), [project, files]);
  const updateResponse = (key: string, value: string) => setProject((current) => ({ ...current, responses: { ...current.responses, [key]: value } }));

  const save = async (complete: boolean) => {
    if (preview) { setNotice("Bản xem tự do không lưu dữ liệu thật. Khi mở tài khoản học sinh, bài sẽ được lưu vào sổ tay."); return; }
    if (readOnly) return;
    if (complete && !ready) { setError("Hoàn thành đủ sáu phần và đính kèm báo cáo/poster/video hoặc link sản phẩm trước khi nộp."); return; }
    if (files.length > 10 || files.some((file) => file.size <= 0 || file.size > MAX_FILE_BYTES || !ACCEPTED_EXTENSIONS.has(file.name.split(".").pop()?.toLowerCase() || ""))) {
      setError("Chọn tối đa 10 tệp PDF, Office, ảnh hoặc video; mỗi tệp tối đa 25 MB."); return;
    }
    const previousTotal = project.attachments.reduce((sum, file) => sum + file.size, 0);
    if (previousTotal + files.reduce((sum, file) => sum + file.size, 0) > MAX_FILE_BYTES) { setError("Tổng dung lượng bài nộp tối đa 25 MB."); return; }
    if (project.projectLink.trim()) {
      try { const link = new URL(project.projectLink.trim()); if (!["https:", "http:"].includes(link.protocol)) throw new Error(); }
      catch { setError("Link sản phẩm cần là địa chỉ http hoặc https hợp lệ."); return; }
    }

    setSaving(true); setError(""); setNotice("");
    const newPaths: string[] = [];
    try {
      if (files.length) {
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError || !user) throw new Error("Phiên học sinh chưa sẵn sàng. Hãy đăng nhập lại để nộp dự án.");
        for (const file of files) {
          const extension = file.name.split(".").pop()?.toLowerCase() || "bin";
          const path = `group-submissions/${user.id}/activity-13_${crypto.randomUUID()}.${extension}`;
          const { error: uploadError } = await supabase.storage.from("class-work").upload(path, file, { contentType: file.type || "application/octet-stream", upsert: false });
          if (uploadError) throw new Error(`Không tải được ${file.name}: ${uploadError.message}`);
          newPaths.push(path);
        }
      }
      const attachments: Attachment[] = [...project.attachments, ...files.map((file, index) => ({ path: newPaths[index], name: file.name.slice(0, 180), size: file.size, type: file.type || "application/octet-stream" }))];
      const evidence: ProjectEvidence = { ...project, attachments };
      const response = await fetch("/api/activity-evidence", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ activityId: 13, complete, evidence }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Không lưu được bài dự án.");
      setProject(evidence); setFiles([]);
      setNotice(complete ? "Đã nộp dự án cho giáo viên. Bài đã khóa để bảo toàn bản nộp." : "Đã lưu nháp dự án lên hệ thống.");
      if (complete) setReadOnly(true);
    } catch (saveError) {
      if (newPaths.length) await supabase.storage.from("class-work").remove(newPaths);
      setError(saveError instanceof Error ? saveError.message : "Không lưu được bài dự án.");
    } finally { setSaving(false); }
  };

  const removeAttachment = async (attachment: Attachment) => {
    if (readOnly || preview) return;
    const nextProject = { ...project, attachments: project.attachments.filter((item) => item.path !== attachment.path) };
    setSaving(true); setError(""); setNotice("");
    try {
      const response = await fetch("/api/activity-evidence", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ activityId: 13, complete: false, evidence: nextProject }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Không cập nhật được tệp đính kèm.");
      setProject(nextProject);
      const { error: storageError } = await supabase.storage.from("class-work").remove([attachment.path]);
      if (storageError) throw new Error("Đã gỡ tệp khỏi bản nháp nhưng chưa xóa được bản lưu trong kho.");
      setNotice("Đã xóa tệp khỏi bản nháp.");
    } catch (removeError) { setError(removeError instanceof Error ? removeError.message : "Không xóa được tệp."); }
    finally { setSaving(false); }
  };

  return <section className="mt-5 space-y-5 rounded-3xl border border-indigo-100 bg-indigo-50/60 p-5 md:p-7">
    <header><p className="text-xs font-extrabold uppercase tracking-widest text-indigo-700">POST01 · 1–2 tuần</p><h3 className="mt-1 text-xl font-extrabold text-slate-950">Nộp dự án và lưu vào hồ sơ lớp</h3><p className="mt-2 text-sm leading-6 text-slate-600">Lưu được bản nháp, tài liệu đính kèm và link sản phẩm. Bản cuối được khóa để giáo viên chấm theo rubric; PDF/poster/video không thay cho phần trình bày lập luận.</p></header>
    {preview && <p className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">Bản xem tự do chỉ hiển thị biểu mẫu. Tải tệp và lưu/nộp cần tài khoản học sinh đã được mở.</p>}
    {error && <p role="alert" className="rounded-xl bg-rose-50 p-3 text-sm text-rose-800">{error}</p>}{notice && <p role="status" className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">{notice}</p>}
    <div className="grid gap-3 md:grid-cols-2">{FIELDS.map((field) => <label key={field.key} className="text-xs font-bold text-slate-700">{field.label}<span className="mt-1 block font-normal leading-5 text-slate-600">{field.prompt}</span><textarea value={project.responses[field.key] || ""} disabled={readOnly} maxLength={4000} onChange={(event) => updateResponse(field.key, event.target.value)} className="mt-2 min-h-28 w-full rounded-xl border border-slate-200 bg-white p-3 text-sm font-normal leading-6 outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-slate-100" placeholder="Viết phần trình bày có công thức, số liệu và đơn vị…" /></label>)}</div>
    <label className="block text-xs font-bold text-slate-700">Link sản phẩm tùy chọn<input type="url" value={project.projectLink} disabled={readOnly} onChange={(event) => setProject((current) => ({ ...current, projectLink: event.target.value }))} placeholder="https://drive.google.com/... hoặc link Canva" className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-normal outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-slate-100" /></label>
    <div className="rounded-2xl border border-dashed border-indigo-200 bg-white p-4"><label className="flex cursor-pointer items-center gap-3"><span className="rounded-xl bg-indigo-50 p-2.5 text-indigo-700"><FileUp className="h-5 w-5"/></span><span><b className="block text-sm">Chọn báo cáo / poster / video</b><small className="text-xs text-slate-500">PDF, Word, PowerPoint, ảnh, MP4 hoặc WebM · tối đa 10 tệp, 25 MB tổng</small></span><input type="file" multiple accept={ACCEPT} disabled={readOnly || preview} onChange={(event) => setFiles(Array.from(event.target.files || []))} className="sr-only" /></label>
      {files.length > 0 && <div className="mt-3 space-y-1 rounded-xl bg-slate-50 p-3 text-xs">{files.map((file) => <p key={`${file.name}-${file.size}`} className="flex justify-between gap-2"><span className="truncate">{file.name}</span><span>{humanSize(file.size)}</span></p>)}</div>}
      {project.attachments.length > 0 && <div className="mt-3 space-y-2">{project.attachments.map((file) => <div key={file.path} className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 p-3"><span className="min-w-0 truncate text-xs font-semibold">{file.name} <span className="font-normal text-slate-500">· {humanSize(file.size)}</span></span><div className="flex shrink-0 items-center gap-1"><a href={`/api/files?bucket=class-work&path=${encodeURIComponent(file.path)}`} target="_blank" rel="noreferrer" aria-label={`Tải ${file.name}`} className="rounded-lg p-2 text-indigo-700 hover:bg-indigo-50"><Download className="h-4 w-4"/></a>{!readOnly && !preview && <button type="button" onClick={() => void removeAttachment(file)} aria-label={`Xóa ${file.name}`} className="rounded-lg p-2 text-rose-600 hover:bg-rose-50"><Trash2 className="h-4 w-4"/></button>}</div></div>)}</div>}
    </div>
    <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-indigo-100 pt-4"><p className="text-xs text-slate-500">{loading ? "Đang tải bản nháp…" : readOnly ? "Đã nộp · giáo viên xem trong Sổ tay hoạt động" : "Tiêu chí bám theo rubric 25/20/20/15/10/10 của tài liệu"}</p><div className="flex gap-2"><button type="button" onClick={() => void save(false)} disabled={loading || saving || readOnly || preview} className="inline-flex items-center gap-2 rounded-xl border border-indigo-200 bg-white px-3 py-2 text-xs font-bold text-indigo-800 disabled:opacity-50">{saving ? <LoaderCircle className="h-4 w-4 animate-spin"/> : <Save className="h-4 w-4"/>}Lưu nháp</button><button type="button" onClick={() => void save(true)} disabled={loading || saving || readOnly || preview || !ready} className="inline-flex items-center gap-2 rounded-xl bg-indigo-700 px-3 py-2 text-xs font-bold text-white disabled:opacity-50">{saving ? <LoaderCircle className="h-4 w-4 animate-spin"/> : <CheckCircle2 className="h-4 w-4"/>}Nộp dự án</button></div></footer>
  </section>;
}
