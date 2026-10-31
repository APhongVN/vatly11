"use client";

import { useEffect, useRef, useState } from "react";
import { Bot, Check, Copy, Maximize2, Minimize2, RotateCcw, Send, User, X } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";

type Message = { role: "user" | "assistant"; text: string };

const WELCOME: Message = {
  role: "assistant",
  text: "Chào em! Mình có thể giúp em hiểu công thức hoặc gợi ý cách giải bài tụ điện. Em đang vướng ở đâu?",
};

const QUICK_PROMPTS = [
  "Công thức điện dung là gì?",
  "Gợi ý bài ghép tụ",
  "Tụ đã ngắt nguồn thì đại lượng nào không đổi?",
];

export default function Chatbot({ initiallyOpen = false }: { initiallyOpen?: boolean }) {
  const [open, setOpen] = useState(initiallyOpen);
  const [isExpanded, setIsExpanded] = useState(false);
  const [messages, setMessages] = useState<Message[]>([WELCOME]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, loading]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  const send = async (prompt?: string) => {
    const question = (prompt ?? input).trim();
    if (!question || loading) return;

    const nextMessages: Message[] = [...messages, { role: "user", text: question }];
    setMessages(nextMessages);
    setInput("");
    setError("");
    setLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: nextMessages.slice(-12).map(({ role, text }) => ({ role, content: text })),
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Trợ lý chưa trả lời được.");
      setMessages((current) => [...current, { role: "assistant", text: data.reply }]);
    } catch (sendError) {
      setError(sendError instanceof Error ? sendError.message : "Mất kết nối. Em thử gửi lại nhé.");
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  };

  const resetChat = () => {
    setMessages([WELCOME]);
    setError("");
    setInput("");
  };

  const copyText = async (text: string, index: number) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedIndex(index);
      window.setTimeout(() => setCopiedIndex(null), 1600);
    } catch {
      setError("Không sao chép được nội dung trên thiết bị này.");
    }
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        aria-label="Mở trợ lý học tập AI"
        className="fixed bottom-4 right-4 z-50 inline-flex items-center gap-2 rounded-2xl bg-blue-700 px-4 py-3 text-sm font-bold text-white shadow-xl shadow-blue-950/20 transition-colors hover:bg-blue-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 sm:bottom-6 sm:right-6"
      >
        <Bot className="h-5 w-5" />
        Hỏi trợ lý AI
      </button>
    );
  }

  return (
    <section
      aria-label="Trợ lý học tập Vật lí 11"
      className={[
        "fixed z-[100] flex flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl shadow-slate-950/20",
        isExpanded
          ? "inset-3"
          : "bottom-3 right-3 h-[min(620px,calc(100dvh-24px))] w-[min(420px,calc(100vw-24px))] sm:bottom-6 sm:right-6",
      ].join(" ")}
    >
      <header className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-blue-700 text-white">
            <Bot className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h2 className="truncate text-sm font-bold text-slate-900">Trợ lý Vật lí 11</h2>
            <p className="text-xs text-slate-500">Giải thích ngắn, gợi ý từng bước</p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <button onClick={resetChat} aria-label="Xóa đoạn chat" title="Cuộc trò chuyện mới" className="rounded-xl p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900">
            <RotateCcw className="h-4 w-4" />
          </button>
          <button onClick={() => setIsExpanded((value) => !value)} aria-label={isExpanded ? "Thu nhỏ" : "Phóng to"} className="rounded-xl p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900">
            {isExpanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </button>
          <button onClick={() => setOpen(false)} aria-label="Đóng trợ lý" className="rounded-xl p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900">
            <X className="h-4 w-4" />
          </button>
        </div>
      </header>

      <div className="flex-1 space-y-4 overflow-y-auto bg-slate-50/70 p-4" aria-live="polite">
        {messages.map((message, index) => (
          <div key={`${index}-${message.role}`} className={`flex gap-2.5 ${message.role === "user" ? "flex-row-reverse" : ""}`}>
            <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${message.role === "user" ? "bg-blue-700 text-white" : "bg-slate-200 text-slate-700"}`}>
              {message.role === "user" ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
            </div>
            <div className={`group relative max-w-[86%] rounded-2xl px-3.5 py-3 text-sm leading-6 ${message.role === "user" ? "rounded-tr-md bg-blue-700 text-white" : "rounded-tl-md border border-slate-200 bg-white text-slate-800 shadow-sm"}`}>
              {message.role === "user" ? (
                <p className="whitespace-pre-wrap">{message.text}</p>
              ) : (
                <>
                  <div className="prose prose-sm max-w-none break-words text-slate-800 prose-p:my-1.5 prose-ul:my-1.5 prose-ol:my-1.5 prose-pre:overflow-x-auto">
                    <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>{message.text}</ReactMarkdown>
                  </div>
                  <button onClick={() => copyText(message.text, index)} aria-label="Sao chép câu trả lời" className="mt-2 inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900">
                    {copiedIndex === index ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                    {copiedIndex === index ? "Đã sao chép" : "Sao chép"}
                  </button>
                </>
              )}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex items-center gap-2 text-xs text-slate-500" role="status">
            <span className="h-2 w-2 animate-pulse rounded-full bg-blue-700" /> Đang soạn câu trả lời…
          </div>
        )}
        {error && (
          <div className="flex items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900" role="alert">
            <span>{error}</span>
            <button onClick={() => send(messages.filter((message) => message.role === "user").at(-1)?.text)} className="shrink-0 font-bold underline" disabled={loading}>Thử lại</button>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {messages.length <= 2 && !loading && (
        <div className="flex gap-2 overflow-x-auto border-t border-slate-100 bg-white px-3 py-2.5 [scrollbar-width:none]">
          {QUICK_PROMPTS.map((prompt) => (
            <button key={prompt} onClick={() => send(prompt)} className="shrink-0 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:border-blue-300 hover:bg-blue-50 hover:text-blue-800">
              {prompt}
            </button>
          ))}
        </div>
      )}

      <form onSubmit={(event) => { event.preventDefault(); void send(); }} className="flex items-end gap-2 border-t border-slate-200 bg-white p-3">
        <textarea
          ref={inputRef}
          value={input}
          onChange={(event) => setInput(event.target.value.slice(0, 1200))}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              void send();
            }
          }}
          rows={1}
          maxLength={1200}
          aria-label="Nhập câu hỏi cho trợ lý"
          placeholder="Nhập câu hỏi…"
          className="max-h-28 min-h-11 flex-1 resize-y rounded-2xl border border-slate-200 bg-slate-50 px-3.5 py-3 text-sm text-slate-900 outline-none transition-colors placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100"
        />
        <button type="submit" disabled={loading || !input.trim()} aria-label="Gửi câu hỏi" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blue-700 text-white transition-colors hover:bg-blue-800 disabled:cursor-not-allowed disabled:bg-slate-300">
          <Send className="h-4 w-4" />
        </button>
      </form>
    </section>
  );
}