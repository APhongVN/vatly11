"use client";

import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import { Download, Eye, FileUp, LoaderCircle, Trash2 } from "lucide-react";
import { normalizeLatexForMarkdown } from "@/lib/latex";

type RubricEditorProps = {
  value: string;
  onChange: (value: string) => void;
  onImportFile: (file: File) => void;
  fileName: string;
  importError?: string;
  isImporting?: boolean;
  disabled?: boolean;
  savedFileName?: string | null;
  onDownloadSavedFile?: () => void;
  onClearFile?: () => void;
  compact?: boolean;
  id?: string;
};

export default function RubricEditor({
  value,
  onChange,
  onImportFile,
  fileName,
  importError = "",
  isImporting = false,
  disabled = false,
  savedFileName,
  onDownloadSavedFile,
  onClearFile,
  compact = false,
  id = "rubric-editor",
}: RubricEditorProps) {
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <label htmlFor={`${id}-text`} className="block text-sm font-bold text-slate-800">Ma trận chấm điểm</label>
          <p className="mt-1 text-xs leading-5 text-slate-500">Tải Word, Excel, PDF hoặc ảnh lên; hệ thống trích nội dung để cô rà lại. Công thức trong Word được chuyển tự động và hiển thị xem trước.</p>
        </div>
        <label className={`inline-flex shrink-0 cursor-pointer items-center gap-2 rounded-xl border px-3.5 py-2.5 text-xs font-bold transition-colors ${disabled || isImporting ? "cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400" : "border-blue-200 bg-white text-blue-700 hover:border-blue-300 hover:bg-blue-50"}`}>
          {isImporting ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <FileUp className="h-4 w-4" />}
          {isImporting ? "Đang đọc tài liệu…" : "Nhập từ tài liệu"}
          <input
            type="file"
            accept=".txt,.md,.csv,.docx,.xlsx,.pdf,.png,.jpg,.jpeg,.webp"
            disabled={disabled || isImporting}
            aria-label="Chọn file ma trận chấm điểm"
            className="sr-only"
            onChange={(event) => {
              const file = event.currentTarget.files?.[0];
              if (file) onImportFile(file);
              event.currentTarget.value = "";
            }}
          />
        </label>
      </div>

      {(fileName || savedFileName) && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-blue-100 bg-blue-50/70 px-3 py-2.5 text-xs">
          <span className="min-w-0 truncate font-semibold text-blue-900">{isImporting ? "Đang trích xuất: " : fileName ? "Tài liệu đã nhập: " : "File gốc đã lưu: "}{fileName || savedFileName}</span>
          {!fileName && savedFileName && onDownloadSavedFile && (
            <button type="button" onClick={onDownloadSavedFile} disabled={disabled} className="inline-flex shrink-0 items-center gap-1.5 font-bold text-emerald-800 hover:text-emerald-950 disabled:opacity-50">
              <Download className="h-3.5 w-3.5" /> Tải file gốc
            </button>
          )}
          {onClearFile && (fileName || savedFileName) && (
            <button type="button" onClick={onClearFile} disabled={disabled} className="inline-flex shrink-0 items-center gap-1.5 font-bold text-rose-700 hover:text-rose-900 disabled:opacity-50">
              <Trash2 className="h-3.5 w-3.5" /> Xóa tài liệu
            </button>
          )}
        </div>
      )}

      {importError && <p role="alert" className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-900">{importError}</p>}

      <textarea
        id={`${id}-text`}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        maxLength={20_000}
        disabled={disabled || isImporting}
        placeholder="Nhập bằng tiếng Việt hoặc tải tài liệu lên. Có thể giữ công thức, không bắt buộc gõ LaTeX."
        className={`w-full resize-y rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm leading-6 text-slate-800 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-50 disabled:text-slate-500 ${compact ? "min-h-28" : "min-h-40"}`}
      />
      <div className="flex items-center justify-between text-[11px] text-slate-500">
        <span>{value.length.toLocaleString("vi-VN")} / 20.000 ký tự · nội dung trích được chỉnh sửa trước khi lưu</span>
        <span className="inline-flex items-center gap-1"><Eye className="h-3.5 w-3.5" /> Xem công thức</span>
      </div>
      <div className="max-h-64 overflow-auto rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
        {value.trim() ? (
          <div className="rubric-math-preview break-words text-sm leading-7 text-slate-800">
            <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]} skipHtml>{normalizeLatexForMarkdown(value)}</ReactMarkdown>
          </div>
        ) : <p className="text-xs text-slate-400">Bản xem trước sẽ hiện tại đây sau khi nhập nội dung hoặc chọn file.</p>}
      </div>
    </div>
  );
}
