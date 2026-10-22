"use client";
import { useState, useRef, useEffect } from "react";
import { MessageSquare, X, Maximize2, Minimize2, Send, Bot, User } from 'lucide-react';

export default function Chatbot() {
  const [open, setOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [messages, setMessages] = useState<Array<{ role: "user" | "ai"; text: string }>>([
    { role: "ai", text: "Chào em! Thầy là trợ lý Vật lí AI. Em cần gợi ý gì về bài Tụ điện?" }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const send = async () => {
    if (!input.trim() || loading) return;
    const userMsg = input;
    setMessages(prev => [...prev, { role: "user", text: userMsg }]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // Gửi dạng { messages: [...] } để API route mới dễ xử lý
        body: JSON.stringify({ messages: [{ role: 'user', content: userMsg }] }) 
      });
      const data = await res.json();
      setMessages(prev => [...prev, { role: "ai", text: data.reply || "Lỗi: AI không phản hồi." }]);
    } catch (error) {
      setMessages(prev => [...prev, { role: "ai", text: "Lỗi mạng, không thể kết nối AI." }]);
    } finally {
      setLoading(false);
    }
  };

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="fixed bottom-6 right-6 w-14 h-14 rounded-full bg-blue-600 text-white shadow-xl hover:bg-blue-700 hover:scale-105 transition-all z-50 flex items-center justify-center">
        <MessageSquare className="w-6 h-6" />
      </button>
    );
  }

  const chatStyle = isExpanded 
    ? { position: 'fixed' as const, inset: 0, width: '100%', height: '100%', borderRadius: 0, zIndex: 100 }
    : { position: 'fixed' as const, bottom: 80, right: 24, width: 380, height: 550, borderRadius: 16, zIndex: 100 };

  return (
    <div style={chatStyle} className="bg-white shadow-2xl border border-gray-200 flex flex-col overflow-hidden animate-slide-up">
      <div className="p-4 border-b bg-blue-600 text-white flex justify-between items-center">
        <div className="flex items-center gap-2"><Bot className="w-5 h-5" /><span className="font-semibold">Trợ lý AI</span></div>
        <div className="flex gap-1">
          <button onClick={() => setIsExpanded(!isExpanded)} className="hover:bg-white/20 p-1.5 rounded-lg">{isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}</button>
          <button onClick={() => setOpen(false)} className="hover:bg-white/20 p-1.5 rounded-lg"><X className="w-4 h-4" /></button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
        {messages.map((m, i) => (
          <div key={i} className={`flex gap-3 ${m.role === "user" ? "flex-row-reverse" : ""}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${m.role === "user" ? "bg-blue-100 text-blue-600" : "bg-emerald-100 text-emerald-600"}`}>
              {m.role === "user" ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
            </div>
            <div className={`text-sm p-3 rounded-2xl max-w-[75%] ${m.role === "user" ? "bg-blue-600 text-white rounded-tr-sm" : "bg-white border border-gray-100 shadow-sm text-gray-800 rounded-tl-sm"}`}>
              {m.text}
            </div>
          </div>
        ))}
        {loading && <div className="text-xs text-gray-500 italic">AI đang trả lời...</div>}
      </div>
      <div className="p-3 border-t bg-white flex gap-2">
        <input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && send()} className="w-full px-4 py-2 bg-gray-100 rounded-xl outline-none" placeholder="Nhập câu hỏi..." />
        <button onClick={send} disabled={loading} className="bg-blue-600 text-white p-2 rounded-xl disabled:opacity-50"><Send className="w-5 h-5" /></button>
      </div>
    </div>
  );
}