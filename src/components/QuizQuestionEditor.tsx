"use client";
import { Trash2 } from "lucide-react";

type QuizQuestion = { question: string; image_url: string; options: string[]; correct_option: number; explanation: string };
type EditingQuiz = { questions?: QuizQuestion[] } & Record<string, unknown>;

// Trình soạn câu hỏi trắc nghiệm dùng cho cả tạo mới và sửa (tách riêng cho gọn).
export default function QuizQuestionEditor({ quiz, setQuiz }: { quiz: EditingQuiz; setQuiz: (value: EditingQuiz) => void }) {
  const questions = quiz.questions || [];
  const update = (index: number, patch: Partial<QuizQuestion>) => {
    const next = [...questions];
    next[index] = { ...next[index], ...patch };
    setQuiz({ ...quiz, questions: next });
  };
  const updateOption = (index: number, optionIndex: number, value: string) => {
    const next = [...questions];
    const options = [...(next[index].options || ["", "", "", ""])];
    options[optionIndex] = value;
    next[index] = { ...next[index], options };
    setQuiz({ ...quiz, questions: next });
  };

  return (
    <div className="space-y-2">
      {questions.map((q, index) => (
        <div key={index} className="rounded-2xl border bg-slate-50/60 p-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-blue-700">Câu {index + 1}</span>
            {questions.length > 1 && (
              <button type="button" onClick={() => setQuiz({ ...quiz, questions: questions.filter((_, i) => i !== index) })} className="inline-flex items-center gap-1 text-xs font-bold text-rose-600"><Trash2 className="h-3 w-3" /> Xóa câu</button>
            )}
          </div>
          <input value={q.question} onChange={(e) => update(index, { question: e.target.value })} placeholder="Nội dung câu hỏi" className="w-full rounded-xl border p-2.5 text-sm" />
          <input value={q.image_url} onChange={(e) => update(index, { image_url: e.target.value })} placeholder="Link ảnh (nếu có)" className="w-full rounded-xl border p-2 text-xs" />
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {(q.options || ["", "", "", ""]).map((opt, optionIndex) => (
              <label key={optionIndex} className="flex items-center gap-2 rounded-xl border bg-white p-2 text-xs">
                <input type="radio" name={`quiz-option-${index}`} checked={q.correct_option === optionIndex} onChange={() => update(index, { correct_option: optionIndex })} />
                <span className="font-bold">{String.fromCharCode(65 + optionIndex)}.</span>
                <input value={opt} onChange={(e) => updateOption(index, optionIndex, e.target.value)} className="flex-1 rounded-lg border p-1.5" aria-label={`Phương án ${String.fromCharCode(65 + optionIndex)}`} />
              </label>
            ))}
          </div>
          <input value={q.explanation} onChange={(e) => update(index, { explanation: e.target.value })} placeholder="Lời giải thích" className="w-full rounded-xl border p-2 text-xs" />
        </div>
      ))}
      <button type="button" onClick={() => setQuiz({ ...quiz, questions: [...questions, { question: "", image_url: "", options: ["", "", "", ""], correct_option: 0, explanation: "" }] })} className="rounded-xl border border-blue-300 px-3 py-2 text-xs font-bold text-blue-700 hover:bg-blue-50">+ Thêm câu hỏi</button>
    </div>
  );
}
