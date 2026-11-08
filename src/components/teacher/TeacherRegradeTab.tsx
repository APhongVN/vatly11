"use client";
import { Bot, CheckCircle } from "lucide-react";

type Submission = {
  id: string;
  student_name?: string;
  activity_id?: number;
  answer?: string;
  ai_score?: number | null;
  final_score?: number | null;
  teacher_feedback?: string | null;
};

/**
 * Tab "Chấm lại bài lỗi": liệt kê bài có AI lỗi/chưa chấm, cho phép chấm lại
 * bằng AI hoặc nhập điểm + nhận xét thủ công của giáo viên.
 */
export default function TeacherRegradeTab({
  submissions,
  onGradeWithAI,
  onSaveTeacherGrade,
}: {
  submissions: Submission[];
  onGradeWithAI: (submissionId: string, answer: string) => void | Promise<void>;
  onSaveTeacherGrade: (submissionId: string, scoreFieldId: string, feedbackFieldId: string) => void | Promise<void>;
}) {
  const pending = submissions.filter((submission) => submission.ai_score === null || submission.ai_score === -1);

  return (
    <div className="space-y-6 max-w-5xl animate-in fade-in">
      <div>
        <h2 className="text-3xl font-extrabold text-amber-600">Chấm lại Bài nộp AI Lỗi / Chưa chấm</h2>
        <p className="text-slate-500 text-sm mt-1">Danh sách các bài làm có điểm AI = -1 hoặc chưa có điểm. Giáo viên có thể chấm thủ công hoặc kích hoạt lại AI.</p>
      </div>

      <div className="space-y-3">
        {pending.length === 0 ? (
          <div className="bg-white p-12 rounded-3xl text-center text-slate-400 text-sm">
            🎉 Tuyệt vời! Không có bài nào bị lỗi hoặc tồn đọng chưa chấm.
          </div>
        ) : (
          pending.map((sub) => (
            <div key={sub.id} className="bg-white border rounded-2xl p-4 shadow-sm space-y-2">
              <div className="flex justify-between items-center">
                <span className="font-bold text-slate-800 text-sm">{sub.student_name} (Bài {sub.activity_id})</span>
                <span className="text-xs bg-amber-100 text-amber-700 px-2.5 py-1 rounded-full font-bold">Cần chấm lại</span>
              </div>
              <div className="bg-slate-50 p-3 rounded-xl text-xs text-slate-700 border">{sub.answer || "Nộp tệp đính kèm"}</div>
              <div className="flex flex-wrap gap-2 items-center pt-1">
                <button
                  type="button"
                  onClick={() => void onGradeWithAI(sub.id, sub.answer || "")}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-3.5 py-2 rounded-xl text-xs font-bold flex gap-1 items-center"
                >
                  <Bot className="w-3.5 h-3.5" /> AI Chấm lại
                </button>
                <input type="number" min="0" max="10" step="0.1" placeholder="Điểm cô" aria-label={`Điểm của cô cho bài ${sub.id}`} className="border p-2 rounded-xl w-20 text-xs bg-slate-50" id={`rescore-${sub.id}`} defaultValue={sub.final_score ?? sub.ai_score ?? ""} />
                <input type="text" placeholder="Nhận xét của cô..." aria-label={`Nhận xét cho bài ${sub.id}`} className="border p-2 rounded-xl flex-1 text-xs bg-slate-50" id={`refb-${sub.id}`} defaultValue={sub.teacher_feedback || ""} />
                <button
                  type="button"
                  onClick={() => void onSaveTeacherGrade(sub.id, `rescore-${sub.id}`, `refb-${sub.id}`)}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white p-2 rounded-xl"
                  aria-label="Xác nhận điểm cho bài này"
                  title="Xác nhận điểm"
                >
                  <CheckCircle className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
