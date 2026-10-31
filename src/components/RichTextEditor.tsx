"use client";

import { useState, useCallback, useRef } from "react";
import DOMPurify from "dompurify";
import { Bold, Italic, Underline, ListOrdered, List, AlignLeft, AlignCenter, AlignRight, Link, Code, Image as ImageIcon, Undo, Redo } from "lucide-react";

interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => string | void;
  placeholder?: string;
  className?: string;
}

import { cn } from "@/lib/utils";

function RichTextEditor({ value, onChange, placeholder, className }: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const [html] = useState(() => DOMPurify.sanitize(value));

  const updateContent = useCallback(() => {
    const content = editorRef.current?.innerHTML || "";
    if (onChange) onChange(DOMPurify.sanitize(content));
  }, [onChange]);

  const format = useCallback((command: string, val?: string) => {
    editorRef.current?.focus();
    document.execCommand(command, false, val ?? undefined);
    updateContent();
  }, [updateContent]);

  const insertLink = useCallback(() => {
    const url = window.prompt("Nhập liên kết:");
    if (url && /^https?:\/\//i.test(url.trim())) {
      document.execCommand("createLink", false, url);
      updateContent();
    }
  }, [updateContent]);

  const insertImage = useCallback(() => {
    const url = window.prompt("Nhập liên kết ảnh:");
    if (url && /^https?:\/\//i.test(url.trim())) {
      document.execCommand("insertImage", false, url);
      updateContent();
    }
  }, [updateContent]);

  return (
    <div className={cn("border border-gray-200 rounded-xl flex flex-col", className)}>
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-1 p-2 border-b border-gray-100 bg-gray-50">
        <button onClick={() => format("bold")} className="p-1.5 hover:bg-gray-200 rounded-lg text-gray-600" title="In đậm"><Bold className="w-4 h-4" /></button>
        <button onClick={() => format("italic")} className="p-1.5 hover:bg-gray-200 rounded-lg text-gray-600" title="In nghiêng"><Italic className="w-4 h-4" /></button>
        <button onClick={() => format("underline")} className="p-1.5 hover:bg-gray-200 rounded-lg text-gray-600" title="Gạch dưới"><Underline className="w-4 h-4" /></button>
        <div className="h-4 w-px bg-gray-300 mx-1" />
        <button onClick={() => format("insertOrderedList")} className="p-1.5 hover:bg-gray-200 rounded-lg text-gray-600" title="Danh sách số"><ListOrdered className="w-4 h-4" /></button>
        <button onClick={() => format("insertUnorderedList")} className="p-1.5 hover:bg-gray-200 rounded-lg text-gray-600" title="Danh sách bullet"><List className="w-4 h-4" /></button>
        <div className="h-4 w-px bg-gray-300 mx-1" />
        <button onClick={() => format("justifyLeft")} className="p-1.5 hover:bg-gray-200 rounded-lg text-gray-600" title="Căn trái"><AlignLeft className="w-4 h-4" /></button>
        <button onClick={() => format("justifyCenter")} className="p-1.5 hover:bg-gray-200 rounded-lg text-gray-600" title="Căn giữa"><AlignCenter className="w-4 h-4" /></button>
        <button onClick={() => format("justifyRight")} className="p-1.5 hover:bg-gray-200 rounded-lg text-gray-600" title="Căn phải"><AlignRight className="w-4 h-4" /></button>
        <div className="h-4 w-px bg-gray-300 mx-1" />
        <button onClick={insertLink} className="p-1.5 hover:bg-gray-200 rounded-lg text-gray-600" title="Liên kết"><Link className="w-4 h-4" /></button>
        <button onClick={insertImage} className="p-1.5 hover:bg-gray-200 rounded-lg text-gray-600" title="Chèn ảnh"><ImageIcon className="w-4 h-4" /></button>
        <button onClick={() => format("formatBlock", "<pre>")} className="p-1.5 hover:bg-gray-200 rounded-lg text-gray-600" title="Mã"><Code className="w-4 h-4" /></button>
        <div className="h-4 w-px bg-gray-300 mx-1" />
        <button onClick={() => format("undo")} className="p-1.5 hover:bg-gray-200 rounded-lg text-gray-600" title="Hoàn tác"><Undo className="w-4 h-4" /></button>
        <button onClick={() => format("redo")} className="p-1.5 hover:bg-gray-200 rounded-lg text-gray-600" title="Làm lại"><Redo className="w-4 h-4" /></button>
        <div className="h-4 w-px bg-gray-300 mx-1" />
        <select onChange={(e) => format("fontSize", e.target.value)} className="text-xs p-1 border rounded" title="Cỡ chữ">
          <option value="3">12px</option>
          <option value="4">14px</option>
          <option value="5">18px</option>
          <option value="6">24px</option>
        </select>
      </div>

      {/* Editor */}
      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        dangerouslySetInnerHTML={{ __html: html }}
        onInput={updateContent}
        onBlur={() => {
          const clean = DOMPurify.sanitize(editorRef.current?.innerHTML || "");
          if (editorRef.current && editorRef.current.innerHTML !== clean) editorRef.current.innerHTML = clean;
          if (onChange) onChange(clean);
        }}
        className="min-h-[200px] p-4 text-gray-800 outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded-b-xl break-words"
        data-placeholder={placeholder}
        style={{ fontFamily: "inherit" }}
      />
    </div>
  );
}

export default RichTextEditor;
