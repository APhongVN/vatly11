"use client";
import { HelpCircle, RefreshCw } from "lucide-react";
import QuestionCard from "@/components/TeacherQuestionCard";
import { QUESTION_STATUS_IDS } from "@/lib/student-questions.mjs";

type StudentQuestion = Record<string, unknown> & { id: string; topic: string; status: string };

/**
 * Tab "Góc hỏi đáp": giáo viên xem, lọc theo trạng thái, phản hồi câu hỏi học sinh.
 */
export default function TeacherQuestionsTab({
  questions,
  loading,
  filter,
  setFilter,
  savingId,
  statusLabel,
  topicLabelOf,
  onReload,
  onRespond,
  onSuggest,
}: {
  questions: StudentQuestion[];
  loading: boolean;
  filter: string;
  setFilter: (value: string) => void;
  savingId: string | null;
  statusLabel: (id: string) => string;
  topicLabelOf: (id: string) => string;
  onReload: () => void;
  onRespond: (questionId: string, response: string, status: string) => void;
  onSuggest: (questionId: string) => Promise<string | null>;
}) {
  const filtered = filter === "all" ? questions : questions.filter((question) => question.status === filter);
  const chips = [{ id: "all", label: `Tất cả (${questions.length})` }].concat(
    QUESTION_STATUS_IDS.map((id: string) => ({ id, label: `${statusLabel(id)} (${questions.filter((question) => question.status === id).length})` })),
  );

  return (
    <div className="space-y-6 max-w-5xl animate-in fade-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 flex items-center gap-2">
            <HelpCircle className="w-7 h-7 text-indigo-600" /> Góc hỏi đáp · Câu hỏi của học sinh
          </h1>
          <p className="text-xs text-slate-500 mt-1">Đọc câu hỏi, gửi phản hồi và cập nhật trạng thái xử lý. Học sinh thấy phản hồi ngay trong mục “Câu hỏi của tôi”.</p>
        </div>
        <button type="button" onClick={onReload} className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50">
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} /> Tải lại
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {chips.map((chip) => (
          <button
            key={chip.id}
            type="button"
            onClick={() => setFilter(chip.id)}
            className={`rounded-full border px-3 py-1.5 text-xs font-bold transition-all ${filter === chip.id ? "bg-indigo-600 text-white border-indigo-600" : "bg-white text-slate-600 border-slate-300 hover:bg-slate-50"}`}
          >{chip.label}</button>
        ))}
      </div>

      <div className="space-y-4">
        {loading && questions.length === 0 ? (
          <p role="status" className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">Đang tải câu hỏi…</p>
        ) : filtered.length === 0 ? (
          <p className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">Chưa có câu hỏi nào trong mục này. Dữ liệu sẽ được cập nhật sau khi học sinh gửi câu hỏi.</p>
        ) : (
          filtered.map((question) => (
            <QuestionCard
              key={question.id}
              question={question as never}
              saving={savingId === question.id}
              topicLabel={topicLabelOf(question.topic)}
              onRespond={(response, status) => onRespond(question.id, response, status)}
              onSuggest={(questionId) => onSuggest(questionId)}
            />
          ))
        )}
      </div>
    </div>
  );
}