"use client";
import { Camera, FileUp, Save, Sparkles, TableProperties } from "lucide-react";

type Activity = { id: number; title: string };
type Student = { id: string; full_name: string };
type OcrResult = { score: number; feedback?: string; strengths?: string; weaknesses?: string } | null;

const ANSWER_FILE_ACCEPT = ".txt,.md,.csv,.docx,.xlsx,.pdf,image/png,image/jpeg,image/webp";
const RUBRIC_FILE_ACCEPT = ".txt,.md,.csv,.docx,.xlsx,.pdf,image/png,image/jpeg,image/webp";

/**
 * Tab "Chấm từ ảnh (AI OCR)": tải ảnh/file bài làm (JPG, PNG, PDF, Word...),
 * tải file ma trận chấm điểm (Word, Excel, PDF...), trích văn bản/công thức,
 * chấm bằng AI theo ma trận và lưu vào bảng điểm.
 */
export default function TeacherOcrTab({
  students, activities, studentName, setStudentName, activityId, setActivityId,
  rubric, setRubric, ocrText, setOcrText, isProcessing, result, isSaving,
  onSelectImage, onSelectRubricFile, onSelectAnswerFile,
  rubricFileName, answerFileName, onGrade, onSave,
}: {
  students: Student[];
  activities: Activity[];
  studentName: string;
  setStudentName: (value: string) => void;
  activityId: number;
  setActivityId: (value: number) => void;
  rubric: string;
  setRubric: (value: string) => void;
  ocrText: string;
  setOcrText: (value: string) => void;
  isProcessing: boolean;
  result: OcrResult;
  isSaving: boolean;
  onSelectImage: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onSelectRubricFile: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onSelectAnswerFile: (event: React.ChangeEvent<HTMLInputElement>) => void;
  rubricFileName: string;
  answerFileName: string;
  onGrade: () => void;
  onSave: () => void;
}) {
  return (
    <div className="space-y-6 max-w-5xl animate-in fade-in">
      <div>
        <h2 className="text-3xl font-extrabold text-slate-900">Chấm điểm từ Ảnh / Tệp (AI OCR)</h2>
        <p className="text-slate-500 text-sm mt-1">Tải ảnh chụp hoặc tệp bài làm (PDF, Word, TXT); AI trích văn bản + công thức LaTeX và chấm theo ma trận, sau đó lưu vào bảng điểm.</p>
      </div>
      <div className="bg-white rounded-3xl border border-slate-200 p-6 md:p-8 space-y-6 shadow-sm">
        <div className="grid md:grid-cols-2 gap-5">
          <div className="space-y-3">
            <div>
              <label htmlFor="ocr-student" className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1">Gán cho học sinh:</label>
              <div className="flex gap-2">
                <select id="ocr-student" value={studentName} onChange={(e) => setStudentName(e.target.value)} className="flex-1 p-2.5 border rounded-xl text-xs bg-slate-50/50">
                  <option value="">-- Chọn học sinh trong lớp --</option>
                  {students.map((student) => <option key={student.id} value={student.full_name}>{student.full_name}</option>)}
                </select>
                <input type="text" value={studentName} onChange={(e) => setStudentName(e.target.value)} placeholder="Hoặc gõ tên..." aria-label="Hoặc gõ tên học sinh" className="w-36 p-2.5 border rounded-xl text-xs" />
              </div>
            </div>
            <div>
              <label htmlFor="ocr-activity" className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1">Bài học liên quan:</label>
              <select id="ocr-activity" value={activityId} onChange={(e) => setActivityId(Number(e.target.value))} className="w-full p-2.5 border rounded-xl text-xs bg-slate-50/50">
                {activities.map((activity) => <option key={activity.id} value={activity.id}>Bài {activity.id}: {activity.title}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="ocr-rubric" className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1">Ma trận điểm (Rubric) cho bài thi này:</label>
              <textarea id="ocr-rubric" value={rubric} onChange={(e) => setRubric(e.target.value)} className="w-full p-3 border rounded-xl text-xs h-28 outline-none bg-slate-50/50" placeholder="Nhập ma trận điểm hoặc tải tệp bên dưới..." />
              <label className="mt-2 inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50">
                <TableProperties className="h-4 w-4 text-indigo-600" /> Tải tệp ma trận chấm điểm
                <input id="ocr-rubric-file" type="file" accept={RUBRIC_FILE_ACCEPT} onChange={onSelectRubricFile} className="hidden" />
              </label>
              {rubricFileName
                ? <p className="mt-1 text-[11px] font-semibold text-emerald-700">Đã nạp ma trận từ: {rubricFileName}</p>
                : <p className="mt-1 text-[10px] text-slate-400">Hỗ trợ Word, Excel, PDF, TXT, ảnh (tối đa 10 MB). Nội dung tệp sẽ điền vào ô ma trận phía trên.</p>}
            </div>
          </div>
          <div className="space-y-3">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block">Tải bài làm của học sinh</span>
            <label htmlFor="ocr-image" className="flex flex-col items-center justify-center border-2 border-dashed border-indigo-200 hover:border-indigo-400 bg-indigo-50/40 rounded-2xl p-8 text-center cursor-pointer transition-colors">
              <input id="ocr-image" type="file" accept="image/png,image/jpeg,image/webp" onChange={onSelectImage} className="sr-only" />
              <Camera className="w-10 h-10 text-indigo-600 mb-2" />
              <p className="text-sm font-bold text-indigo-900">Bấm để chọn ảnh bài làm (JPG, PNG)</p>
              <p className="text-xs text-indigo-600 mt-1">AI tự động nhận dạng chữ viết tay và công thức trong ảnh</p>
            </label>
            <label className="flex items-center justify-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer">
              <FileUp className="h-4 w-4 text-indigo-600" /> Hoặc tải tệp bài làm (PDF, Word, TXT, ảnh...)
              <input id="ocr-answer-file" type="file" accept={ANSWER_FILE_ACCEPT} onChange={onSelectAnswerFile} className="hidden" />
            </label>
            {answerFileName && <p className="text-[11px] font-semibold text-emerald-700">Đã đọc nội dung từ: {answerFileName}</p>}
            {isProcessing && (
              <div role="status" className="p-3 bg-indigo-50 rounded-xl text-xs text-indigo-700 font-semibold flex items-center justify-center gap-2">
                <Sparkles className="w-4 h-4 animate-spin text-indigo-600" /> Đang nhận diện nội dung tệp…
              </div>
            )}
          </div>
        </div>
        <div className="space-y-2">
          <label htmlFor="ocr-text" className="text-xs font-bold text-slate-700 uppercase tracking-wider block">Nội dung bài làm (sau khi trích xuất — có thể chỉnh sửa nếu cần):</label>
          <textarea id="ocr-text" value={ocrText} onChange={(e) => setOcrText(e.target.value)} className="w-full p-4 border rounded-2xl text-xs h-36 outline-none bg-slate-50/50 leading-relaxed font-mono" placeholder="Nội dung nhận diện từ ảnh hoặc tệp..." />
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button type="button" onClick={onGrade} disabled={isProcessing || !ocrText.trim()} className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-md transition-all flex items-center gap-2">
            <Sparkles className="w-4 h-4" /> Chấm điểm bài này bằng AI
          </button>
        </div>
        {result && (
          <div className="p-6 bg-gradient-to-br from-indigo-50 to-blue-50 border border-indigo-200 rounded-2xl space-y-4 animate-in fade-in">
            <div className="flex justify-between items-center pb-2 border-b border-indigo-200">
              <span className="text-sm font-bold text-indigo-900">KẾT QUẢ CHẤM ĐIỂM AI:</span>
              <span className="text-2xl font-black text-indigo-700">{result.score}/10</span>
            </div>
            <p className="text-xs text-slate-800"><span className="font-bold">Nhận xét:</span> {result.feedback}</p>
            {result.strengths && <p className="text-xs text-emerald-800"><span className="font-bold">Ưu điểm:</span> {result.strengths}</p>}
            {result.weaknesses && <p className="text-xs text-amber-800"><span className="font-bold">Hạn chế:</span> {result.weaknesses}</p>}
            <div className="pt-2 flex justify-end">
              <button type="button" onClick={onSave} disabled={isSaving} className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md transition-all flex items-center gap-2">
                <Save className="w-4 h-4" /> {isSaving ? "Đang lưu vào hệ thống..." : "Lưu kết quả này vào Bảng điểm Học sinh"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}