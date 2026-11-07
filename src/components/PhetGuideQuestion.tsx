"use client";

import { Lightbulb } from "lucide-react";
import type { GuideQuestion } from "@/lib/data/phet-guide";

export type ActiveQuestion = { question: GuideQuestion; selected: number | null; checked: boolean; correct: boolean };

export default function PhetGuideQuestion({
  active,
  onCheck,
  onContinue,
  onSelect,
}: {
  active: ActiveQuestion;
  onCheck: () => void;
  onContinue: () => void;
  onSelect: (index: number) => void;
}) {
  return (
    <div className="rounded-2xl border border-purple-200 bg-purple-50 p-4 space-y-3">
      <p className="text-xs font-bold text-purple-900">{active.question.prompt}</p>
      <div className="space-y-1.5">
        {active.question.options.map((option, index) => {
          const selected = active.selected === index;
          const showCorrect = active.checked && index === active.question.answer;
          const showWrong = active.checked && selected && !active.correct;
          return (
            <label key={option} className={`flex items-center gap-2 rounded-xl border p-2.5 text-xs ${showCorrect ? "border-emerald-400 bg-emerald-50" : showWrong ? "border-rose-300 bg-rose-50" : selected ? "border-purple-400 bg-white" : "border-slate-200 bg-white"}`}>
              <input type="radio" name={active.question.id} checked={selected} onChange={() => !active.checked && onSelect(index)} disabled={active.checked} />
              <span>{option}</span>
            </label>
          );
        })}
      </div>
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={onCheck} disabled={active.selected === null || active.checked} className="rounded-xl bg-purple-600 px-4 py-2 text-xs font-bold text-white hover:bg-purple-700 disabled:opacity-40">Kiểm tra câu trả lời</button>
        <button type="button" onClick={onContinue} className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50">Tiếp tục xem</button>
      </div>
      {active.checked ? (
        <p className={`text-xs font-bold flex items-center gap-1.5 ${active.correct ? "text-emerald-700" : "text-amber-700"}`}>
          <Lightbulb className="h-4 w-4" />
          {active.correct ? "Chính xác! Có thể tiếp tục xem video." : "Chưa phù hợp. Hãy xem lại đoạn video liên quan rồi chọn lại."}
        </p>
      ) : null}
    </div>
  );
}
