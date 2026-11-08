"use client";
import { CheckSquare, ExternalLink, Merge, Plus, Save, Square, Upload, X } from "lucide-react";
import CapacitanceLabSettings from "@/components/CapacitanceLabSettings";
import RubricEditor from "@/components/RubricEditor";

type Activity = Record<string, any> & { id: number; title: string };

/**
 * Tab "Bài học cá nhân": sửa nội dung, đính kèm tài liệu, cài ma trận, gộp bài.
 */
export default function TeacherActivitiesTab({
  activities, previewMode, selectedForMerge, expandedAct,
  savingActivityId, uploadingDocumentId, isImportingEditRubric,
  editRubricText, editRubricFileName, editRubricImportError,
  savedNameFor, privateFileHref, showMergeModal, mergeTitle, mergeDesc,
  onNavigateCreate, onToggleSelect, onExpand, onSave, onUploadFile,
  onEditRubricText, onEditRubricFile, onClearEditRubric, onDownloadRubric,
  onOpenMerge, onCloseMerge, onMergeTitle, onMergeDesc, onExecuteMerge, onClearSelection,
}: {
  activities: Activity[];
  previewMode: boolean;
  selectedForMerge: number[];
  expandedAct: number | null;
  savingActivityId: number | null;
  uploadingDocumentId: number | null;
  isImportingEditRubric: boolean;
  editRubricText: string;
  editRubricFileName: string;
  editRubricImportError: string;
  savedNameFor: (activity: Activity) => string | null | undefined;
  privateFileHref: (value: string) => string;
  showMergeModal: boolean;
  mergeTitle: string;
  mergeDesc: string;
  onNavigateCreate: () => void;
  onToggleSelect: (id: number) => void;
  onExpand: (activity: Activity) => void;
  onSave: (id: number, event: React.FormEvent) => void;
  onUploadFile: (event: React.ChangeEvent<HTMLInputElement>, id: number) => void;
  onEditRubricText: (value: string) => void;
  onEditRubricFile: (file: File) => void;
  onClearEditRubric: () => void;
  onDownloadRubric: (activity: Activity) => void;
  onOpenMerge: () => void;
  onCloseMerge: () => void;
  onMergeTitle: (value: string) => void;
  onMergeDesc: (value: string) => void;
  onExecuteMerge: () => void;
  onClearSelection: () => void;
}) {
  return (
    <div className="space-y-6 max-w-5xl animate-in fade-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-extrabold text-slate-900">Quản lý Bài học Cá nhân ({activities.length})</h2>
          <p className="text-slate-500 text-sm mt-1">Chỉnh sửa nội dung, đính kèm tài liệu, cài ma trận điểm hoặc gộp các bài học lại với nhau.</p>
        </div>
        <div className="flex items-center gap-3">
          <button type="button" onClick={onNavigateCreate} className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md transition-all flex items-center gap-2">
            <Plus className="w-4 h-4" /> Tạo bài tập mới
          </button>
          {selectedForMerge.length >= 2 && (
            <button type="button" onClick={onOpenMerge} className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md transition-all flex items-center gap-2">
              <Merge className="w-4 h-4" /> Gộp ({selectedForMerge.length}) bài đã chọn
            </button>
          )}
        </div>
      </div>

      <div className="p-4 rounded-2xl bg-blue-50/70 border border-blue-100 flex items-center justify-between gap-3 text-xs text-blue-900">
        <span>💡 Tích chọn vào các ô vuông ở góc mỗi bài học để <strong>Gộp 2 hoặc nhiều bài thành 1 bài duy nhất</strong>.</span>
        {selectedForMerge.length > 0 && (
          <button type="button" onClick={onClearSelection} className="shrink-0 text-blue-700 underline font-semibold">Hủy chọn ({selectedForMerge.length})</button>
        )}
      </div>

      <div className="space-y-3">
        {activities.map((act) => {
          const isSelectedForMerge = selectedForMerge.includes(act.id);
          const isExpanded = expandedAct === act.id;
          return (
            <div key={act.id} className={`bg-white rounded-2xl shadow-sm border transition-all ${isSelectedForMerge ? "border-indigo-400 ring-2 ring-indigo-200" : "border-slate-200/80 hover:border-slate-300"}`}>
              <div className="p-4 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <button type="button" onClick={() => onToggleSelect(act.id)} aria-label={`Chọn gộp bài ${act.title}`} className="text-slate-400 hover:text-indigo-600 transition-colors">
                    {isSelectedForMerge ? <CheckSquare className="w-5 h-5 text-indigo-600" /> : <Square className="w-5 h-5 text-slate-300" />}
                  </button>
                  <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-sm shrink-0">{act.id}</div>
                  <button type="button" onClick={() => onExpand(act)} className="min-w-0 text-left">
                    <h3 className="font-bold text-base text-slate-800">{act.title}</h3>
                    <p className="text-xs text-slate-500">{act.description || "Chưa có mô tả"} • {act.deadline ? `Hạn: ${new Date(act.deadline).toLocaleString("vi-VN")}` : "Không giới hạn hạn nộp"}</p>
                  </button>
                </div>
                <button type="button" onClick={() => onExpand(act)} className="shrink-0 px-3 py-1.5 rounded-xl bg-blue-50 text-blue-700 text-xs font-bold hover:bg-blue-100">
                  {isExpanded ? "Thu gọn" : "Sửa"}
                </button>
              </div>

              {isExpanded && (
                <form onSubmit={(event) => onSave(act.id, event)} className="border-t border-slate-100 p-4 space-y-4">
                  <div className="grid md:grid-cols-2 gap-3">
                    <label className="text-xs font-bold text-slate-700">Tên bài
                      <input name="title" defaultValue={act.title} className="mt-1 w-full border p-2.5 rounded-xl text-sm font-normal" />
                    </label>
                    <label className="text-xs font-bold text-slate-700">Hạn nộp
                      <input name="deadline" type="datetime-local" defaultValue={act.deadline ? new Date(act.deadline).toISOString().slice(0, 16) : ""} className="mt-1 w-full border p-2.5 rounded-xl text-sm font-normal" />
                    </label>
                  </div>
                  <label className="block text-xs font-bold text-slate-700">Mô tả
                    <textarea name="desc" defaultValue={act.description || ""} rows={2} className="mt-1 w-full border p-2.5 rounded-xl text-sm font-normal" />
                  </label>
                  <label className="block text-xs font-bold text-slate-700">Link video
                    <input name="video" defaultValue={act.video_url || ""} className="mt-1 w-full border p-2.5 rounded-xl text-sm font-normal" />
                  </label>
                  <RubricEditor
                    id={`edit-rubric-${act.id}`}
                    compact
                    value={editRubricText}
                    onChange={onEditRubricText}
                    onImportFile={onEditRubricFile}
                    fileName={editRubricFileName}
                    importError={editRubricImportError}
                    isImporting={isImportingEditRubric}
                    disabled={savingActivityId === act.id}
                    savedFileName={savedNameFor(act)}
                    onDownloadSavedFile={() => onDownloadRubric(act)}
                    onClearFile={onClearEditRubric}
                  />
                  <div className="flex flex-wrap gap-4 items-center pt-2">
                    <label className={`bg-blue-50 text-blue-700 border border-blue-200 px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${uploadingDocumentId === act.id ? "cursor-wait opacity-60" : "hover:bg-blue-100 cursor-pointer"}`} aria-disabled={uploadingDocumentId === act.id}>
                      <Upload className="w-4 h-4" /> {uploadingDocumentId === act.id ? "Đang tải và lưu…" : "Tải tệp tài liệu / Phiếu bài"}
                      <input type="file" className="sr-only" disabled={uploadingDocumentId === act.id} onChange={(event) => onUploadFile(event, act.id)} aria-label={`Tải tệp tài liệu cho bài ${act.title}`} />
                    </label>
                    {act.document_url && (
                      <a href={privateFileHref(act.document_url)} target="_blank" rel="noreferrer" className="text-emerald-600 hover:underline text-xs font-semibold flex items-center gap-1">
                        <ExternalLink className="w-3.5 h-3.5" /> Xem tệp tài liệu hiện tại
                      </a>
                    )}
                    <button type="submit" disabled={savingActivityId === act.id || isImportingEditRubric} className="ml-auto bg-blue-600 hover:bg-blue-700 disabled:cursor-wait disabled:opacity-50 text-white px-5 py-2 rounded-xl text-xs font-bold shadow-md transition-all flex items-center gap-2">
                      <Save className="w-4 h-4" /> {savingActivityId === act.id ? "Đang lưu…" : "Lưu thay đổi"}
                    </button>
                  </div>
                </form>
              )}
            </div>
          );
        })}
      </div>

      {showMergeModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onCloseMerge(); }}>
          <div role="dialog" aria-modal="true" aria-labelledby="merge-title" className="bg-white rounded-3xl p-6 md:p-8 max-w-lg w-full shadow-2xl space-y-5 animate-in fade-in">
            <div className="flex justify-between items-center">
              <h3 id="merge-title" className="text-xl font-bold text-slate-900 flex items-center gap-2"><Merge className="w-5 h-5 text-indigo-600" /> Xác nhận gộp {selectedForMerge.length} bài học</h3>
              <button type="button" aria-label="Đóng hộp thoại gộp bài" onClick={onCloseMerge} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
            </div>
            <p className="text-xs text-slate-500">Các bài học được chọn: <strong>{selectedForMerge.join(", ")}</strong> sẽ được hợp nhất thành 1 bài duy nhất. Bài nộp của học sinh được chuyển vào bài mới.</p>
            <div className="space-y-3">
              <label className="block text-xs font-bold text-slate-700">Tên bài sau khi gộp
                <input value={mergeTitle} onChange={(event) => onMergeTitle(event.target.value)} className="mt-1 w-full p-3 border rounded-xl outline-none text-sm" required />
              </label>
              <label className="block text-xs font-bold text-slate-700">Mô tả bài gộp (tùy chọn)
                <textarea value={mergeDesc} onChange={(event) => onMergeDesc(event.target.value)} className="mt-1 w-full p-3 border rounded-xl outline-none text-sm h-20" placeholder="Nội dung tóm tắt..." />
              </label>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button type="button" onClick={onCloseMerge} className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100">Hủy bỏ</button>
              <button type="button" onClick={onExecuteMerge} className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md">Thực hiện gộp ngay</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
