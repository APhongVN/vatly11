"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Activity } from "@/lib/data/activities";
import { BookOpen, Download, ExternalLink, FileText, Link2, LoaderCircle, Pencil, Search, Trash2, UploadCloud, X } from "lucide-react";

type Resource = {
  id: string; title: string; description: string; resource_type: "file" | "link"; category: string;
  tags: string[]; storage_path: string | null; source_url: string | null; mime_type: string | null;
  file_size: number | null; activity_id: number | null; is_published: boolean; created_at: string;
};
const BUCKET = "learning-resources";
const CATEGORIES = ["Bài giảng", "Phiếu bài tập", "Đề kiểm tra", "Video", "Thí nghiệm", "Tài liệu tham khảo", "Khác"];
const MAX_FILE_BYTES = 100 * 1024 * 1024;

function readableSize(size: number | null) {
  if (!size) return "Liên kết";
  return size < 1024 * 1024 ? `${Math.max(1, Math.round(size / 1024))} KB` : `${(size / 1024 / 1024).toFixed(1)} MB`;
}

export default function ResourceLibrary({ activities, previewMode = false }: { activities: Activity[]; previewMode?: boolean }) {
  const [resources, setResources] = useState<Resource[]>(previewMode ? [
    { id: "preview-1", title: "Bài giảng: Điện dung và các yếu tố ảnh hưởng", description: "Tài liệu mẫu minh họa kho học liệu.", resource_type: "link", category: "Bài giảng", tags: ["tụ điện", "điện dung"], storage_path: null, source_url: "https://example.com", mime_type: null, file_size: null, activity_id: 8, is_published: true, created_at: new Date().toISOString() },
    { id: "preview-2", title: "Phiếu thực nghiệm tụ điện", description: "Bản mẫu hiển thị trong chế độ xem.", resource_type: "file", category: "Phiếu bài tập", tags: ["thí nghiệm"], storage_path: null, source_url: null, mime_type: "application/pdf", file_size: 245760, activity_id: 8, is_published: false, created_at: new Date().toISOString() },
  ] : []);
  const [files, setFiles] = useState<File[]>([]);
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState("");
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [activityId, setActivityId] = useState("");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("Tất cả");
  const [sort, setSort] = useState("recent");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const refresh = useCallback(async () => {
    if (previewMode) { setLoading(false); return; }
    setLoading(true);
    const { data, error: queryError } = await supabase.from("learning_resources").select("*").order("created_at", { ascending: false }).limit(500);
    if (queryError) setError("Chưa tải được kho học liệu. Cần áp dụng migration 006 và đăng nhập bằng tài khoản giáo viên.");
    else setResources((data || []) as Resource[]);
    setLoading(false);
  }, [previewMode]);
  useEffect(() => { void refresh(); }, [refresh]);

  const visible = useMemo(() => resources
    .filter((item) => filter === "Tất cả" || item.category === filter)
    .filter((item) => !search.trim() || [item.title, item.description, item.category, ...item.tags].join(" ").toLocaleLowerCase("vi").includes(search.trim().toLocaleLowerCase("vi")))
    .sort((a, b) => sort === "name" ? a.title.localeCompare(b.title, "vi") : sort === "category" ? a.category.localeCompare(b.category, "vi") || a.title.localeCompare(b.title, "vi") : new Date(b.created_at).getTime() - new Date(a.created_at).getTime()),
  [resources, filter, search, sort]);

  const tagList = () => Array.from(new Set(tags.split(/[;,]/).map((tag) => tag.trim()).filter(Boolean))).slice(0, 12);
  const clearForm = () => { setFiles([]); setTitle(""); setUrl(""); setDescription(""); setTags(""); if (inputRef.current) inputRef.current.value = ""; };

  const uploadFiles = async () => {
    if (!files.length || saving) return;
    if (files.length > 20 || files.some((file) => file.size > MAX_FILE_BYTES)) { setError("Tối đa 20 tệp mỗi lượt, dung lượng mỗi tệp không quá 100 MB."); return; }
    setSaving(true); setError(""); setNotice("");
    let completed = 0;
    for (const file of files) {
      const path = `${new Date().getFullYear()}/${crypto.randomUUID()}-${file.name.normalize("NFKC").replace(/[^\p{L}\p{N}._-]+/gu, "_").slice(0, 150)}`;
      const uploaded = await supabase.storage.from(BUCKET).upload(path, file, { contentType: file.type || "application/octet-stream", upsert: false });
      if (uploaded.error) { setError(`Không tải được ${file.name}: ${uploaded.error.message}`); break; }
      const saved = await supabase.from("learning_resources").insert({
        title: title.trim() && files.length === 1 ? title.trim() : file.name,
        description: description.trim(), resource_type: "file", category, tags: tagList(),
        storage_path: path, mime_type: file.type || "application/octet-stream", file_size: file.size,
        activity_id: activityId ? Number(activityId) : null,
      });
      if (saved.error) { await supabase.storage.from(BUCKET).remove([path]); setError(`Không lưu được thông tin ${file.name}: ${saved.error.message}`); break; }
      completed += 1;
    }
    if (completed) setNotice(`Đã thêm ${completed} tài liệu.`);
    if (completed === files.length) clearForm();
    await refresh(); setSaving(false);
  };

  const addLink = async (event: React.FormEvent) => {
    event.preventDefault(); if (!url.trim() || saving) return;
    let parsed: URL;
    try { parsed = new URL(url.trim()); } catch { setError("Đường dẫn chưa hợp lệ."); return; }
    if (!["https:", "http:"].includes(parsed.protocol)) { setError("Chỉ nhận liên kết http hoặc https."); return; }
    setSaving(true); setError(""); setNotice("");
    const result = await supabase.from("learning_resources").insert({
      title: title.trim() || parsed.hostname, description: description.trim(), resource_type: "link",
      category, tags: tagList(), source_url: parsed.toString(), activity_id: activityId ? Number(activityId) : null,
    });
    if (result.error) setError(`Chưa lưu được liên kết: ${result.error.message}`);
    else { setNotice("Đã thêm liên kết vào kho."); clearForm(); setUrl(""); await refresh(); }
    setSaving(false);
  };

  const publish = async (item: Resource) => {
    const { error: updateError } = await supabase.from("learning_resources").update({ is_published: !item.is_published }).eq("id", item.id);
    if (updateError) setError(`Không đổi được trạng thái: ${updateError.message}`); else await refresh();
  };
  const remove = async (item: Resource) => {
    if (!window.confirm(`Xóa “${item.title}” khỏi kho?`)) return;
    if (item.storage_path) {
      const { error: storageError } = await supabase.storage.from(BUCKET).remove([item.storage_path]);
      if (storageError) { setError(`Không xóa được tệp: ${storageError.message}`); return; }
    }
    const { error: dbError } = await supabase.from("learning_resources").delete().eq("id", item.id);
    if (dbError) setError(`Không xóa được tài liệu: ${dbError.message}`); else await refresh();
  };
  const open = async (item: Resource) => {
    if (item.source_url) { window.open(item.source_url, "_blank", "noopener,noreferrer"); return; }
    if (!item.storage_path) return;
    const { data, error: signedError } = await supabase.storage.from(BUCKET).createSignedUrl(item.storage_path, 3600);
    if (signedError || !data?.signedUrl) setError("Không tạo được liên kết tải tệp. Hãy kiểm tra quyền kho học liệu.");
    else window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  };
  const download = async (item: Resource) => {
    if (item.source_url) { window.open(item.source_url, "_blank", "noopener,noreferrer"); return; }
    if (!item.storage_path) return;
    const { data, error: downloadError } = await supabase.storage.from(BUCKET).download(item.storage_path);
    if (downloadError || !data) { setError("Không tải được tài liệu. Hãy kiểm tra quyền truy cập."); return; }
    const objectUrl = URL.createObjectURL(data);
    const anchor = document.createElement("a"); anchor.href = objectUrl; anchor.download = item.title; anchor.click();
    URL.revokeObjectURL(objectUrl);
  };  const saveEdit = async (event: React.FormEvent<HTMLFormElement>, id: string) => {
    event.preventDefault(); const values = new FormData(event.currentTarget);
    const { error: updateError } = await supabase.from("learning_resources").update({
      title: String(values.get("title") || "").trim(), description: String(values.get("description") || "").trim(),
      category: String(values.get("category") || "Khác"), tags: String(values.get("tags") || "").split(/[;,]/).map((tag) => tag.trim()).filter(Boolean).slice(0, 12),
    }).eq("id", id);
    if (updateError) setError(`Không lưu được thay đổi: ${updateError.message}`); else { setEditingId(null); await refresh(); }
  };

  return <div className="mx-auto max-w-7xl space-y-6 pb-10">
    <header className="flex flex-col justify-between gap-4 rounded-3xl bg-gradient-to-br from-slate-950 via-blue-950 to-indigo-900 p-6 text-white shadow-xl md:flex-row md:items-end md:p-8">
      <div><p className="mb-2 text-xs font-bold uppercase tracking-[.18em] text-blue-200">Quản trị nội dung</p><h1 className="text-3xl font-black md:text-4xl">Kho học liệu</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-blue-100">Tập trung tệp, video và đường dẫn; gắn vào hoạt động, phân loại bằng thẻ và kiểm soát nội dung học sinh được xem.</p></div>
      <div className="flex gap-3"><div className="rounded-2xl border border-white/15 bg-white/10 px-4 py-3"><b className="block text-2xl">{resources.length}</b><span className="text-xs text-blue-100">tài nguyên</span></div><div className="rounded-2xl border border-white/15 bg-white/10 px-4 py-3"><b className="block text-2xl">{resources.filter((item) => item.is_published).length}</b><span className="text-xs text-blue-100">đã xuất bản</span></div></div>
    </header>
    {(error || notice) && <div role={error ? "alert" : "status"} className={`rounded-2xl border px-4 py-3 text-sm ${error ? "border-rose-200 bg-rose-50 text-rose-800" : "border-emerald-200 bg-emerald-50 text-emerald-800"}`}>{error || notice}</div>}
    <div className="grid gap-6 xl:grid-cols-[minmax(320px,.8fr)_minmax(0,1.2fr)]">
      <section className="space-y-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
        <div><h2 className="text-lg font-bold text-slate-900">Thêm tài liệu hoặc liên kết</h2><p className="mt-1 text-xs leading-5 text-slate-500">Tải tối đa 20 tệp/lượt, mỗi tệp 100 MB; hỗ trợ mọi định dạng tệp phổ biến và link web, video, Drive, OneDrive.</p></div>
        <input ref={inputRef} type="file" multiple onChange={(event) => setFiles(Array.from(event.target.files || []).slice(0, 20))} className="sr-only" id="resource-files" />
        <label htmlFor="resource-files" onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); setFiles(Array.from(event.dataTransfer.files).slice(0, 20)); }} className="flex min-h-32 cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-blue-200 bg-blue-50/60 p-5 text-center hover:border-blue-400 hover:bg-blue-50"><UploadCloud className="mb-2 h-7 w-7 text-blue-700" /><b className="text-sm text-slate-800">Kéo thả hoặc chọn nhiều tệp</b><span className="mt-1 text-xs text-slate-500">PDF, Office, ảnh, âm thanh, video, tệp nén…</span></label>
        {files.length > 0 && <div className="max-h-24 space-y-1 overflow-auto rounded-xl bg-slate-50 p-3 text-xs">{files.map((file) => <div key={file.name + file.size} className="flex justify-between gap-2"><span className="truncate">{file.name}</span><span>{readableSize(file.size)}</span></div>)}</div>}
        <button onClick={() => void uploadFiles()} disabled={!files.length || saving} className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-700 px-4 py-3 text-sm font-bold text-white hover:bg-blue-800 disabled:bg-slate-300">{saving ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <UploadCloud className="h-4 w-4" />} Tải tệp lên</button>
        <div className="relative py-1 text-center text-[10px] font-bold uppercase tracking-widest text-slate-400"><span className="relative z-10 bg-white px-3">hoặc lưu liên kết</span><span className="absolute left-0 right-0 top-1/2 border-t border-slate-200" /></div>
        <form onSubmit={(event) => void addLink(event)} className="flex gap-2"><input type="url" value={url} onChange={(event) => setUrl(event.target.value)} placeholder="https://..." className="min-w-0 flex-1 rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-500" /><button disabled={!url.trim() || saving} className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-slate-300 px-3 py-2 text-xs font-bold hover:bg-slate-50 disabled:opacity-50"><Link2 className="h-4 w-4" /> Thêm link</button></form>
        <div className="grid gap-3 sm:grid-cols-2"><label className="text-xs font-semibold">Tên hiển thị<input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Tùy chọn" className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-normal" /></label><label className="text-xs font-semibold">Danh mục<select value={category} onChange={(event) => setCategory(event.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-normal">{CATEGORIES.map((item) => <option key={item}>{item}</option>)}</select></label><label className="text-xs font-semibold sm:col-span-2">Gắn vào hoạt động<select value={activityId} onChange={(event) => setActivityId(event.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-normal"><option value="">Thư viện chung</option>{activities.map((activity) => <option key={activity.id} value={activity.id}>{activity.code} · {activity.title}</option>)}</select></label><label className="text-xs font-semibold sm:col-span-2">Mô tả<textarea value={description} onChange={(event) => setDescription(event.target.value)} rows={2} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-normal" /></label><label className="text-xs font-semibold sm:col-span-2">Thẻ tìm kiếm<input value={tags} onChange={(event) => setTags(event.target.value)} placeholder="tụ điện; điện dung; bài 1" className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-normal" /></label></div>
        <p className="text-[11px] leading-5 text-slate-500">Tài liệu mới là bản nháp. Chỉ giáo viên đã xác thực mới có quyền tải lên hoặc xuất bản.</p>
      </section>
      <section className="min-w-0 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
        <div className="mb-4 flex flex-col justify-between gap-3 lg:flex-row lg:items-center"><div><h2 className="text-lg font-bold">Thư viện tài liệu</h2><p className="mt-1 text-xs text-slate-500">Tìm nhanh theo tên, mô tả, danh mục hoặc thẻ.</p></div><div className="relative lg:max-w-xs"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Tìm học liệu..." className="w-full rounded-xl border border-slate-200 py-2.5 pl-9 pr-3 text-sm" /></div></div>
        <div className="mb-4 flex flex-wrap gap-2"><select value={filter} onChange={(event) => setFilter(event.target.value)} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs"><option>Tất cả</option>{CATEGORIES.map((item) => <option key={item}>{item}</option>)}</select><select value={sort} onChange={(event) => setSort(event.target.value)} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs"><option value="recent">Mới nhất</option><option value="name">Tên A–Z</option><option value="category">Danh mục</option></select><button onClick={() => void refresh()} className="ml-auto rounded-xl border border-slate-200 px-3 py-2 text-xs">Làm mới</button></div>
        {loading ? <div className="grid min-h-60 place-items-center text-sm text-slate-500"><span className="flex items-center gap-2"><LoaderCircle className="h-5 w-5 animate-spin" />Đang tải tài liệu…</span></div> : visible.length === 0 ? <div className="grid min-h-60 place-items-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center"><div><FileText className="mx-auto mb-2 h-8 w-8 text-slate-300" /><b className="text-sm">Chưa có học liệu phù hợp</b><p className="mt-1 text-xs text-slate-500">Tải tệp hoặc lưu liên kết để tạo thư viện dùng chung.</p></div></div> : <div className="space-y-3">{visible.map((item) => <article key={item.id} className="rounded-2xl border border-slate-200 p-4 hover:border-blue-200">
          {editingId === item.id ? <form onSubmit={(event) => void saveEdit(event, item.id)} className="space-y-2"><input name="title" required defaultValue={item.title} className="w-full rounded-lg border px-3 py-2 text-sm font-semibold" /><textarea name="description" defaultValue={item.description} rows={2} className="w-full rounded-lg border px-3 py-2 text-xs" /><div className="flex gap-2"><select name="category" defaultValue={item.category} className="rounded-lg border px-2 py-1.5 text-xs">{CATEGORIES.map((option) => <option key={option}>{option}</option>)}</select><input name="tags" defaultValue={item.tags.join(", ")} className="min-w-0 flex-1 rounded-lg border px-2 py-1.5 text-xs" /></div><button className="rounded-lg bg-blue-700 px-3 py-1.5 text-xs font-bold text-white">Lưu thay đổi</button><button type="button" onClick={() => setEditingId(null)} className="ml-2 rounded-lg px-3 py-1.5 text-xs">Hủy</button></form> : <><div className="flex items-start gap-3"><div className="rounded-xl bg-blue-50 p-2.5 text-blue-700">{item.resource_type === "link" ? <Link2 className="h-5 w-5" /> : <FileText className="h-5 w-5" />}</div><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h3 className="break-words text-sm font-bold">{item.title}</h3><span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px]">{item.category}</span><span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${item.is_published ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-800"}`}>{item.is_published ? "Đã xuất bản" : "Bản nháp"}</span></div>{item.description && <p className="mt-1 text-xs text-slate-600">{item.description}</p>}<div className="mt-2 flex flex-wrap gap-2 text-[10px] text-slate-500"><span>{readableSize(item.file_size)}</span><span>{new Date(item.created_at).toLocaleDateString("vi-VN")}</span>{item.activity_id && <span className="inline-flex items-center gap-1"><BookOpen className="h-3 w-3" />{activities.find((activity) => activity.id === item.activity_id)?.title || `Hoạt động ${item.activity_id}`}</span>}</div>{item.tags.map((tag) => <span key={tag} className="mr-1 mt-2 inline-block rounded-md bg-blue-50 px-2 py-0.5 text-[10px] text-blue-700">#{tag}</span>)}</div></div><div className="mt-3 flex flex-wrap justify-between gap-2 border-t pt-3"><button onClick={() => void download(item)} className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-2 text-xs font-bold text-white">{item.resource_type === "link" ? <ExternalLink className="h-3.5 w-3.5" /> : <Download className="h-3.5 w-3.5" />}{item.resource_type === "link" ? "Mở link" : "Tải về"}</button><div className="flex items-center gap-1"><button onClick={() => void publish(item)} className="rounded-lg px-3 py-2 text-xs font-semibold hover:bg-slate-50">{item.is_published ? "Ẩn" : "Xuất bản"}</button><button onClick={() => setEditingId(item.id)} aria-label="Sửa tài liệu" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"><Pencil className="h-4 w-4" /></button><button onClick={() => void remove(item)} aria-label="Xóa tài liệu" className="rounded-lg p-2 text-rose-600 hover:bg-rose-50"><Trash2 className="h-4 w-4" /></button></div></div></>}
        </article>)}</div>}
      </section>
    </div>
  </div>;
}
