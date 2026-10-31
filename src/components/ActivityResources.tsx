"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Download, ExternalLink, FileText, Link2 } from "lucide-react";

type PublishedResource = { id: string; title: string; description: string; resource_type: "file" | "link"; source_url: string | null; storage_path: string | null; category: string; file_size: number | null };

export default function ActivityResources({ activityId }: { activityId: number }) {
  const [items, setItems] = useState<PublishedResource[]>([]);
  useEffect(() => {
    let active = true;
    supabase.from("learning_resources").select("id,title,description,resource_type,source_url,storage_path,category,file_size")
      .eq("activity_id", activityId).eq("is_published", true).order("display_order").then(({ data }) => {
        if (active && data) setItems(data as PublishedResource[]);
      });
    return () => { active = false; };
  }, [activityId]);

  if (!items.length) return null;
  const downloadResource = async (item: PublishedResource) => {
    if (item.source_url) { window.open(item.source_url, "_blank", "noopener,noreferrer"); return; }
    if (!item.storage_path) return;
    const { data } = await supabase.storage.from("learning-resources").createSignedUrl(item.storage_path, 900);
    if (data?.signedUrl) window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  };

  return <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
    <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900"><FileText className="h-5 w-5 text-blue-700" /> Học liệu của hoạt động</h2>
    <div className="mt-3 grid gap-2 sm:grid-cols-2">{items.map((item) => <article key={item.id} className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 p-3">
      <div className="flex min-w-0 items-center gap-2"><span className="rounded-lg bg-blue-50 p-2 text-blue-700">{item.resource_type === "link" ? <Link2 className="h-4 w-4" /> : <FileText className="h-4 w-4" />}</span><div className="min-w-0"><h3 className="truncate text-sm font-semibold">{item.title}</h3><p className="text-[11px] text-slate-500">{item.category}{item.description ? ` · ${item.description}` : ""}</p></div></div>
      <button onClick={() => void downloadResource(item)} aria-label={`Tải ${item.title}`} className="shrink-0 rounded-lg bg-slate-900 p-2 text-white hover:bg-blue-800">{item.resource_type === "link" ? <ExternalLink className="h-4 w-4" /> : <Download className="h-4 w-4" />}</button>
    </article>)}</div>
  </section>;
}