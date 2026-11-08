"use client";

import { useState } from "react";
import { CheckCircle2, ExternalLink, Lightbulb, RotateCcw } from "lucide-react";
import { PHET_SIM_URL } from "@/lib/data/phet-guide";

type Statement = { id: number; statement: string; is_false: boolean; explanation: string; topic: string };

export default function StatementGame({ statements, readOnly = false }: { statements: Statement[]; readOnly?: boolean }) {
  const [selected, setSelected] = useState<number | null>(null);
  const [reason, setReason] = useState("");
  const [checked, setChecked] = useState(false);
  const [correct, setCorrect] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);
  const [attemptCount, setAttemptCount] = useState(0);
  const [notice, setNotice] = useState("");

  const check = () => {
    if (selected === null || reason.trim().length < 5) { setNotice("Hãy chọn phát biểu và viết lí do (tối thiểu 5 ký tự) trước khi kiểm tra."); return; }
    const statement = statements.find((item) => item.id === selected);
    if (!statement) return;
    const isCorrect = statement.is_false;
    setChecked(true); setCorrect(isCorrect); setAttemptCount((count) => count + 1);
    if (isCorrect) setCorrectCount((count) => count + 1);
    setNotice(isCorrect ? "Chính xác! Phát biểu này sai. Lý do: " + statement.explanation : "Chưa đúng. Phát biểu này đúng; hãy tìm phát biểu sai khác.");
  };
  const next = () => { setSelected(null); setReason(""); setChecked(false); setCorrect(false); };
  const reset = () => { setSelected(null); setReason(""); setChecked(false); setCorrect(false); setCorrectCount(0); setAttemptCount(0); setNotice(""); };

  if (statements.length === 0) return <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center text-sm text-slate-500">Chưa có phát biểu nào. Dữ liệu sẽ được cập nhật sau khi giáo viên thêm nội dung.</div>;

  return (
    <section className="rounded-3xl border border-emerald-200 bg-white shadow-sm overflow-hidden">
      <div className="p-4 border-b bg-gradient-to-r from-emerald-50 to-emerald-50">
        <h3 className="font-bold text-base text-emerald-900 flex items-center gap-2"><CheckCircle2 className="h-5 w-5 text-emerald-600" /> Trò chơi “Truy tìm phát biểu sai”</h3>
        <p className="text-[11px] text-emerald-700/80 mt-1">Chọn phát biểu <strong>sai</strong>, viết lí do và bấm “Kiểm tra”. Hệ thống ghi nhận số câu đúng và số lần thử.</p>
      </div>
      <div className="p-4 space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          {statements.map((statement) => {
            const isSelected = selected === statement.id;
            const showResult = checked && isSelected;
            return (
              <button key={statement.id} type="button" onClick={() => { if (!readOnly && !checked) setSelected(statement.id); }}
                className={`rounded-2xl border p-4 text-left text-sm transition-all ${showResult ? (correct ? "border-emerald-300 bg-emerald-50" : "border-rose-300 bg-rose-50") : isSelected ? "border-emerald-400 bg-emerald-50" : "border-slate-200 bg-white hover:border-emerald-300"}`}>
                <span className="font-bold text-slate-800">Phát biểu {statement.id}</span>
                <span className="mt-1 block leading-6 text-slate-700">{statement.statement}</span>
                {showResult ? <span className={`mt-2 block text-xs font-bold ${correct ? "text-emerald-700" : "text-rose-700"}`}>{correct ? "Phát biểu sai — chọn đúng!" : "Phát biểu này đúng — chọn phát biểu sai khác."}</span> : null}
              </button>
            );
          })}
        </div>
        <div className="space-y-2">
          <label htmlFor="game-reason" className="text-xs font-bold text-slate-700">Lí do em chọn phát biểu này là sai</label>
          <textarea id="game-reason" value={reason} onChange={(event) => setReason(event.target.value)} rows={3} maxLength={1000}
            placeholder="Ví dụ: Hai bản tụ mang điện tích trái dấu và cùng độ lớn…"
            className="w-full rounded-xl border border-slate-300 p-3 text-sm outline-none focus:ring-2 focus:ring-emerald-400" />
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button type="button" onClick={check} disabled={readOnly || checked || selected === null || reason.trim().length < 5}
            className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-40"><CheckCircle2 className="h-4 w-4" /> Kiểm tra</button>
          {checked ? <button type="button" onClick={next} className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"><RotateCcw className="h-4 w-4" /> Chọn phát biểu khác</button> : null}
          <button type="button" onClick={reset} className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"><RotateCcw className="h-4 w-4" /> Làm lại từ đầu</button>
          <span className="ml-auto text-xs font-bold text-slate-600">Đúng: {correctCount} · Thử: {attemptCount}</span>
        </div>
        {notice ? <p className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700 flex items-center gap-2"><Lightbulb className="h-4 w-4 text-amber-500" /> {notice}</p> : null}
        <div className="flex flex-wrap gap-2">
          <a href={PHET_SIM_URL} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"><ExternalLink className="h-3.5 w-3.5" /> Thực hành mô phỏng PhET</a>
        </div>
      </div>
    </section>
  );
}
