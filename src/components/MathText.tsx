"use client";

import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";
import { normalizeLatexForMarkdown } from "@/lib/latex";

/**
 * Component render văn bản có thể chứa công thức LaTeX (chatbot, câu hỏi trắc nghiệm,
 * đáp án, lời giải) — hiển thị bằng KaTeX. Đặt inline để dùng trong dòng chữ (span/li).
 */
export default function MathText({ children, className = "", inline = false }: { children: string; className?: string; inline?: boolean }) {
  if (!children || !children.trim()) return null;
  const wrapper = inline
    ? `math-text-break math-inline ${className}`.trim()
    : `math-text-break block ${className}`.trim();
  return (
    <span className={wrapper}>
      <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]} components={{ p: inline ? "span" : "p" }}>{normalizeLatexForMarkdown(children)}</ReactMarkdown>
    </span>
  );
}