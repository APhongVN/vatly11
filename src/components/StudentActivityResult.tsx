import { Award } from "lucide-react";

export default function StudentActivityResult({ score, feedback, gradedAt }: { score: number | null; feedback: string | null; gradedAt?: string | null }) {
  if (score === null) return null;
  return <aside className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4" aria-label="Kết quả giáo viên đã duyệt">
    <div className="flex items-start gap-3"><Award className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700"/><div className="min-w-0"><p className="font-extrabold text-emerald-950">Cô đã duyệt · {score}/10</p>{feedback && <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-emerald-900">{feedback}</p>}{gradedAt && <p className="mt-2 text-[11px] text-emerald-700">{new Date(gradedAt).toLocaleString("vi-VN")}</p>}</div></div>
  </aside>;
}
