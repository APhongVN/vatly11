"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { getResourceDownloadName } from "@/lib/resource-download.mjs";
import { Download, ExternalLink, FileText, Link2, LoaderCircle } from "lucide-react";

type PublishedResource = { id: string; title: string; description: string; resource_type: "file" | "link"; source_url: string | null; storage_path: string | null; category: string; file_size: number | null };
const RESOURCE_SELECT = "id,title,description,resource_type,source_url,storage_path,category,file_size";

export default function ActivityResources({ activityId }: { activityId: number | null }) {
  const [items, setItems] = useState<PublishedResource[]>([]);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    const query = activityId === null
      ? supabase.from("learning_resources").select(RESOURCE_SELECT).is("activity_id", null).eq("is_published", true).order("display_order")
      : supabase.from("learning_resources").select(RESOURCE_SELECT).eq("activity_id", activityId).eq("is_published", true).order("display_order");
    query.then(({ data }) => {
      if (active && data) setItems(data as PublishedResource[]);
    });
    return () => { active = false; };
  }, [activityId]);

  if (!items.length) return null;
  const downloadResource = async (item: PublishedResource) => {
    setError("");
    if (item.source_url) {
      window.open(item.source_url, "_blank", "noopener,noreferrer");
      return;
    }
    if (!item.storage_path || downloadingId) return;
    setDownloadingId(item.id);
    try {
      const { data, error: downloadError } = await supabase.storage.from("learning-resources").download(item.storage_path);
      if (downloadError || !data) throw downloadError || new Error("Không nhận được dữ liệu tệp.");
      const objectUrl = URL.createObjectURL(data);
      const anchor = document.createElement("a");
      anchor.href = objectUrl;
      anchor.download = getResourceDownloadName(item.storage_path, item.title);
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
    } catch {
      setError(`Không tải được “${item.title}”. Hãy đăng nhập bằng tài khoản lớp và kiểm tra quyền của tài liệu.`);
    } finally {
      setDownloadingId(null);
    }
  };

  return <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
    <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900"><FileText className="h-5 w-5 text-blue-700" /> {activityId === null ? "Học liệu chung của lớp" : "Học liệu của hoạt động"}</h2>
    {error && <p role="alert" className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700">{error}</p>}
    <div className="mt-3 grid gap-2 sm:grid-cols-2">{items.map((item) => <article key={item.id} className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 p-3">
      <div className="flex min-w-0 items-center gap-2"><span className="rounded-lg bg-blue-50 p-2 text-blue-700">{item.resource_type === "link" ? <Link2 className="h-4 w-4" /> : <FileText className="h-4 w-4" />}</span><div className="min-w-0"><h3 className="truncate text-sm font-semibold">{item.title}</h3><p className="text-[11px] text-slate-500">{item.category}{item.description ? ` · ${item.description}` : ""}</p></div></div>
      <button type="button" onClick={() => void downloadResource(item)} aria-label={item.resource_type === "link" ? `Mở ${item.title}` : `Tải ${item.title}`} disabled={downloadingId !== null} className="shrink-0 rounded-lg bg-slate-900 p-2 text-white hover:bg-blue-800 disabled:opacity-50">{downloadingId === item.id ? <LoaderCircle className="h-4 w-4 animate-spin" /> : item.resource_type === "link" ? <ExternalLink className="h-4 w-4" /> : <Download className="h-4 w-4" />}</button>
    </article>)}</div>
  </section>;
}
