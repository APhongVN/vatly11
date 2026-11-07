"use client";
import { useState } from "react";
import { Send, CheckCircle2, Clock } from "lucide-react";
import { QUESTION_STATUS_IDS } from "@/lib/student-questions.mjs";

type StudentQuestion = {
  id: string;
  topic: string;
  content: string;
  status: string;
  teacher_response: string | null;
  created_at: string;
  students?: { full_name?: string; class_name?: string } | null;
};

const STATUS_LABEL: Record<string, string> = {
  unanswered: "Chưa trả lời",
  answered: "Đã trả lời",
  resolved: "Đã giải quyết",
};

const STATUS_CLASS: Record<string, string> = {
  unanswered: "bg-amber-100 text-amber-800 border-amber-200",
  answered: "bg-blue-100 text-blue-800 border-blue-200",
  resolved: "bg-emerald-100 text-emerald-800 border-emerald-200",
};

function formatDateTime(value: string) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString("vi-VN", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit", year: "numeric" });
}

export default function TeacherQuestionCard({
  question,
  saving,
  topicLabel,
  onRespond,
  onSuggest,
}: {
  question: StudentQuestion;
  saving: boolean;
  topicLabel: string;
  onRespond: (response: string, status: string) => void;
  onSuggest: (questionId: string) => Promise<string | null>;
}) {
  const [draft, setDraft] = useState(question.teacher_response || "");
  const [suggesting, setSuggesting] = useState(false);
  const studentName = question.students?.full_name || "Học sinh";
  const className = question.students?.class_name || "";
  const hasResponse = Boolean((draft || "").trim());
  const availableStatuses = QUESTION_STATUS_IDS.filter((id: string) => id !== "unanswered");

  const requestSuggestion = async () => {
    setSuggesting(true);
    try {
      const suggestion = await onSuggest(question.id);
      if (suggestion) setDraft(suggestion);
    } finally {
      setSuggesting(false);
    }
  };

  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-bold text-slate-900">
            {studentName}{className ? <span className="text-xs font-normal text-slate-400"> · {className}</span> : null}
          </p>
          <p className="text-[10px] font-bold uppercase tracking-wide text-indigo-700 mt-0.5">{topicLabel}</p>
        </div>
        <span className={`shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full border ${STATUS_CLASS[question.status] || STATUS_CLASS.unanswered}`}>
          {STATUS_LABEL[question.status] || "Chưa trả lời"}
        </span>
      </div>

      <p className="text-sm leading-6 text-slate-800 whitespace-pre-line break-words">{question.content}</p>
      <p className="text-[10px] text-slate-400 flex items-center gap-1"><Clock className="w-3 h-3" /> Gửi lúc: {formatDateTime(question.created_at)}</p>

      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <label htmlFor={`resp-${question.id}`} className="text-xs font-bold text-slate-600">Phản hồi của giáo viên</label>
          <button type="button" onClick={() => void requestSuggestion()} disabled={suggesting}
            className="inline-flex items-center gap-1.5 rounded-lg border border-violet-300 bg-violet-50 px-2.5 py-1 text-[10px] font-bold text-violet-700 hover:bg-violet-100 disabled:opacity-40">
            {suggesting ? "Đang gợi ý…" : "Gợi ý AI"}
          </button>
        </div>
        <textarea
          id={`resp-${question.id}`}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          rows={3}
          maxLength={3000}
          placeholder="Nhập phản hồi cho học sinh…"
          className="w-full rounded-xl border border-slate-300 p-2.5 text-xs outline-none focus:ring-2 focus:ring-indigo-400 resize-y"
        />
        <div className="flex flex-wrap items-center justify-end gap-2">
          {availableStatuses.map((id: string) => (
            <button
              key={id}
              type="button"
              disabled={saving || (id !== "unanswered" && !hasResponse)}
              onClick={() => onRespond(draft, id)}
              className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold disabled:opacity-40 ${
                id === "resolved" ? "bg-emerald-600 text-white hover:bg-emerald-700" : "bg-blue-600 text-white hover:bg-blue-700"
              }`}
            >
              {id === "resolved" ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Send className="w-3.5 h-3.5" />}
              {saving ? "Đang lưu…" : `Lưu · ${STATUS_LABEL[id]}`}
            </button>
          ))}
        </div>
      </div>
    </article>
  );
}
