"use client";

import {
  Download, Bot, FileText, CheckCircle, Sparkles, ExternalLink, Save,
} from "lucide-react";
import RubricEditor from "@/components/RubricEditor";

type TeacherGradingTabProps = {
  activities: any[];
  selectedGradingAct: any;
  setSelectedGradingAct: (act: any) => void;
  rubricText: string;
  setRubricText: (value: string) => void;
  rubricFile: File | null;
  setRubricFile: (file: File | null) => void;
  rubricFileName: string;
  setRubricFileName: (value: string) => void;
  rubricImportError: string;
  setRubricImportError: (value: string) => void;
  isImportingRubric: boolean;
  isSavingRubric: boolean;
  gradingId: string | null;
  currentSubmissions: any[];
  reportClassFilter: string;
  setReportClassFilter: (value: string) => void;
  studentClassOptions: string[];
  isExportingReport: boolean;
  reportExportError: string;
  reportExportSuccess: string;
  exportExcelReport: () => void;
  gradeWithAI: (id: string, answer: string) => void;
  saveTeacherGrade: (id: string, scoreInputId: string, feedbackInputId: string) => void;
  handleRubricFileUpload: (file: File) => void;
  downloadRubricDocument: (act: any) => void;
  rubricDocumentSchemaReady: boolean;
  privateFileHref: (value: string) => string;
  activeStudents: any[];
  getAvatar: (name: string) => string;
  formatTime: (value: string | null | undefined) => string;
  saveRubric: () => void;
  rubricFileCleared: boolean;
  clearRubricFileAndSave: () => void;
};

export default function TeacherGradingTab({
  activities,
  selectedGradingAct,
  setSelectedGradingAct,
  rubricText,
  setRubricText,
  rubricFile,
  setRubricFile,
  rubricFileName,
  setRubricFileName,
  rubricImportError,
  setRubricImportError,
  isImportingRubric,
  isSavingRubric,
  gradingId,
  currentSubmissions,
  reportClassFilter,
  setReportClassFilter,
  studentClassOptions,
  isExportingReport,
  reportExportError,
  reportExportSuccess,
  exportExcelReport,
  gradeWithAI,
  saveTeacherGrade,
  handleRubricFileUpload,
  downloadRubricDocument,
  rubricDocumentSchemaReady,
  privateFileHref,
  activeStudents,
  getAvatar,
  formatTime,
  saveRubric,
  rubricFileCleared,
  clearRubricFileAndSave,
}: TeacherGradingTabProps) {
  return (
    <div className="flex flex-col lg:flex-row gap-6 max-w-7xl h-[85vh] animate-in fade-in">
      <div className="w-full lg:w-80 bg-white rounded-3xl shadow-sm border border-slate-200/80 flex flex-col shrink-0">
        <div className="p-4 border-b font-bold text-slate-800 text-sm flex items-center justify-between">
          <span>Chọn Bài tập cần chấm</span>
          <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">{activities.length}</span>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {activities.map(act => (
            <button
              key={act.id}
              onClick={() => { setSelectedGradingAct(act); setRubricText(act.grading_rubric || ""); setRubricFile(null); setRubricFileName(""); setRubricImportError(""); }}
              className={`w-full text-left p-3 rounded-2xl transition-all ${
                selectedGradingAct?.id === act.id ? 'bg-blue-600 text-white font-bold shadow-md' : 'hover:bg-slate-100 text-slate-700'
              }`}
            >
              <span className="block text-xs font-bold">Bài {act.id}: {act.title}</span>
              <span className="text-[11px] opacity-80 block truncate">{act.description || "Tự luận"}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 bg-white rounded-3xl shadow-sm border border-slate-200/80 flex flex-col overflow-hidden">
        {selectedGradingAct ? (
          <>
            <div className="p-4 border-b bg-slate-50 flex flex-wrap justify-between items-center gap-3">
              <div>
                <h2 className="font-extrabold text-base text-slate-900">
                  Bài {selectedGradingAct.id}: {selectedGradingAct.title}
                </h2>
                <p className="text-xs text-slate-500">Tổng cộng {currentSubmissions.length} bài đã nộp từ học sinh</p>
              </div>
              <div className="flex flex-col items-end gap-1.5">
                <select value={reportClassFilter} onChange={(event) => setReportClassFilter(event.target.value)} aria-label="Lọc báo cáo theo lớp" className="rounded-xl border border-slate-300 bg-white px-2.5 py-2 text-xs font-semibold"><option value="">Tất cả lớp</option>{studentClassOptions.map((className) => <option key={className} value={className}>{className}</option>)}</select><button type="button" disabled={isExportingReport} onClick={() => void exportExcelReport()} className="bg-emerald-600 hover:bg-emerald-700 disabled:cursor-wait disabled:opacity-60 text-white px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm">
                  <Download className="w-3.5 h-3.5" /> {isExportingReport ? "Đang tạo báo cáo…" : "Xuất báo cáo Excel"}
                </button>
                {reportExportError && <p role="alert" className="max-w-md text-right text-[11px] font-semibold text-rose-700">{reportExportError}</p>}
                {reportExportSuccess && <p role="status" className="text-right text-[11px] font-semibold text-emerald-700">{reportExportSuccess}</p>}
              </div>
            </div>

            <div className="space-y-3 border-b bg-blue-50/40 p-4">
              <RubricEditor
                id={`grading-rubric-${selectedGradingAct.id}`}
                value={rubricText}
                onChange={setRubricText}
                onImportFile={(file) => void handleRubricFileUpload(file)}
                fileName={rubricFile ? rubricFileName : ""}
                importError={rubricImportError}
                isImporting={isImportingRubric}
                disabled={isSavingRubric}
                savedFileName={rubricFileCleared ? null : selectedGradingAct.rubric_document_name}
                onDownloadSavedFile={() => void downloadRubricDocument(selectedGradingAct)}
                onClearFile={() => clearRubricFileAndSave()}
              />
              {!rubricDocumentSchemaReady && rubricFile && <p role="status" className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-900">Cần migration 20261031002700_rubric_document_import.sql để lưu file gốc ma trận.</p>}
              <div className="flex justify-end">
                <button type="button" disabled={isSavingRubric || isImportingRubric} onClick={() => void saveRubric()} className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-bold text-white hover:bg-black disabled:cursor-wait disabled:opacity-50">
                  <Save className="h-4 w-4" /> {isSavingRubric ? "Đang lưu ma trận…" : "Lưu ma trận và file gốc"}
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-3">
                <p className="text-xs font-bold text-slate-700">Tình trạng làm bài hoạt động {selectedGradingAct.id} ({currentSubmissions.length}/{activeStudents.length} học sinh đã làm)</p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {activeStudents.map((student: any) => {
                    const did = currentSubmissions.some((sub: any) => sub.student_id === student.id || sub.student_name === student.full_name);
                    return (
                      <span key={student.id} className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${did ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-rose-200 bg-rose-50 text-rose-700"}`}>
                        {did ? "✓" : "✗"} {student.full_name}
                      </span>
                    );
                  })}
                  {activeStudents.length === 0 && <span className="text-[11px] text-slate-400">Chưa có học sinh trong danh sách.</span>}
                </div>
              </div>
              {currentSubmissions.length === 0 && (
                <div className="text-center py-16 text-slate-400 text-xs">Chưa có học sinh nào nộp bài số {selectedGradingAct.id}.</div>
              )}
              {currentSubmissions.map(sub => (
                <div key={sub.id} className="border border-slate-200/90 rounded-2xl p-4 shadow-sm bg-white space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-slate-800 text-sm flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold">{getAvatar(sub.student_name)}</div>
                      {sub.student_name}
                    </span>
                    <span className="text-xs text-slate-400">{formatTime(sub.submitted_at)}</span>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-xl text-xs text-slate-700 whitespace-pre-line border border-slate-100">{sub.answer || "Nộp tệp đính kèm"}</div>
                  {sub.file_url && (
                    <a href={privateFileHref(sub.file_url)} target="_blank" rel="noreferrer" className="text-blue-600 text-xs underline font-semibold flex items-center gap-1">
                      <ExternalLink className="w-3.5 h-3.5" /> Xem tệp bài làm đính kèm
                    </a>
                  )}
                  {sub.ai_score !== null && sub.ai_score !== undefined && (
                    <div className="bg-gradient-to-br from-indigo-50/80 to-blue-50/80 p-3.5 rounded-xl border border-indigo-100 space-y-1.5 text-xs">
                      <div className="flex justify-between items-center font-bold">
                        <span className="text-indigo-900 flex items-center gap-1"><Sparkles className="w-3.5 h-3.5 text-indigo-600" /> Kết quả chấm AI:</span>
                        <span className="text-sm text-indigo-700">{sub.ai_score}/10</span>
                      </div>
                      {sub.ai_feedback && <p className="text-slate-700">{sub.ai_feedback}</p>}
                      {sub.ai_strengths && <p className="text-emerald-700"><span className="font-semibold">Điểm mạnh:</span> {sub.ai_strengths}</p>}
                      {sub.ai_weaknesses && <p className="text-amber-700"><span className="font-semibold">Cần cải thiện:</span> {sub.ai_weaknesses}</p>}
                    </div>
                  )}
                  <div className="flex flex-wrap gap-2 items-center pt-1">
                    <button onClick={() => gradeWithAI(sub.id, sub.answer)} disabled={gradingId === sub.id} className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-2 rounded-xl text-xs font-bold flex gap-1.5 items-center transition-all disabled:opacity-50">
                      <Bot className="w-3.5 h-3.5"/> {gradingId === sub.id ? "Đang chấm AI..." : "AI Chấm lại"}
                    </button>
                    <input type="number" min="0" max="10" step="0.1" placeholder="Điểm cô" className="border p-2 rounded-xl w-20 text-xs bg-slate-50" id={`score-${sub.id}`} defaultValue={sub.final_score ?? sub.ai_score ?? ""} />
                    <input type="text" placeholder="Nhận xét của cô..." className="border p-2 rounded-xl flex-1 text-xs bg-slate-50" id={`fb-${sub.id}`} defaultValue={sub.teacher_feedback || ""} />
                    <button onClick={() => void saveTeacherGrade(sub.id, `score-${sub.id}`, `fb-${sub.id}`)} className="bg-emerald-600 hover:bg-emerald-700 text-white p-2 rounded-xl shadow-sm" title="Lưu điểm & nhận xét">
                      <CheckCircle className="w-4 h-4"/>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-400 p-8">
            <FileText className="w-16 h-16 mb-4 opacity-20" />
            <p>Chọn một bài tập từ danh sách bên trái để chấm điểm.</p>
          </div>
        )}
      </div>
    </div>
  );
}