"use client";
import { useState, useRef, useEffect } from "react";
import { useChat } from '@ai-sdk/react';
import { MessageSquare, X, Maximize2, Minimize2, Send, Bot, User } from 'lucide-react';

export default function Chatbot() {
  const [open, setOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [size, setSize] = useState({ width: 380, height: 550 });
  const [localInput, setLocalInput] = useState("");
  
  const resizingRef = useRef(false);
  const startPosRef = useRef({ x: 0, y: 0, w: 0, h: 0 });

  // Sử dụng append thay vì handleSubmit của thư viện để tránh lỗi phiên bản
  const { messages, append, status, error } = useChat({ api: '/api/chat' });
  const isLoading = status === 'streaming' || status === 'submitted';

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (!resizingRef.current) return;
      const dx = startPosRef.current.x - e.clientX;
      const dy = startPosRef.current.y - e.clientY;
      setSize({
        width: Math.max(320, startPosRef.current.w + dx),
        height: Math.max(400, startPosRef.current.h + dy),
      });
    };
    const onMouseUp = () => { resizingRef.current = false; };
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    return () => { window.removeEventListener('mousemove', onMouseMove); window.removeEventListener('mouseup', onMouseUp); };
  }, []);

  const startResize = (e: React.MouseEvent) => {
    resizingRef.current = true;
    startPosRef.current = { x: e.clientX, y: e.clientY, w: size.width, h: size.height };
  };

  const onFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!localInput.trim() || isLoading) return;
    append({ role: 'user', content: localInput });
    setLocalInput("");
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
    : { position: 'fixed' as const, bottom: 80, right: 24, width: size.width, height: size.height, borderRadius: 16, zIndex: 100 };

  return (
    <div style={chatStyle} className="bg-white shadow-2xl border border-gray-200 flex flex-col overflow-hidden animate-slide-up">
      <div className="p-4 border-b bg-gradient-to-r from-blue-600 to-blue-500 text-white flex justify-between items-center shadow-sm">
        <div className="flex items-center gap-2">
          <Bot className="w-5 h-5" />
          <span className="font-semibold tracking-wide">Trợ lý Vật lí AI</span>
        </div>
        <div className="flex gap-1">
          <button onClick={() => setIsExpanded(!isExpanded)} className="hover:bg-white/20 p-1.5 rounded-lg transition-colors" title={isExpanded ? "Thu nhỏ" : "Phóng to"}>
            {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
          <button onClick={() => { setOpen(false); setIsExpanded(false); }} className="hover:bg-white/20 p-1.5 rounded-lg transition-colors" title="Đóng">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50/50">
        {messages.length === 0 && (
          <div className="text-center text-gray-500 mt-10 text-sm">
            <Bot className="w-12 h-12 mx-auto mb-3 text-blue-200" />
            <p>Chào em! Thầy là trợ lý Vật lí AI.</p>
            <p>Em cần gợi ý gì về bài Tụ điện?</p>
          </div>
        )}
        {messages.map((m) => (
          <div key={m.id} className={`flex gap-3 ${m.role === "user" ? "flex-row-reverse" : ""}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${m.role === "user" ? "bg-blue-100 text-blue-600" : "bg-emerald-100 text-emerald-600"}`}>
              {m.role === "user" ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
            </div>
            <div className={`text-sm p-3 rounded-2xl max-w-[75%] ${m.role === "user" ? "bg-blue-600 text-white rounded-tr-sm" : "bg-white border border-gray-100 shadow-sm text-gray-800 rounded-tl-sm"}`}>
              {m.content}
            </div>
          </div>
        ))}
        
        {isLoading && (
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
              <Bot className="w-4 h-4" />
            </div>
            <div className="bg-white border border-gray-100 shadow-sm p-3 rounded-2xl rounded-tl-sm flex items-center gap-1">
              <div className="w-1.5 h-1.5 bg-gray-400 rounded-full typing-dot"></div>
              <div className="w-1.5 h-1.5 bg-gray-400 rounded-full typing-dot"></div>
              <div className="w-1.5 h-1.5 bg-gray-400 rounded-full typing-dot"></div>
            </div>
          </div>
        )}
        {error && (
           <div className="text-xs text-red-500 text-center bg-red-50 p-2 rounded-lg border border-red-100">
             Lỗi: {error.message}
           </div>
        )}
      </div>

      <form onSubmit={onFormSubmit} className="p-3 border-t bg-white">
        <div className="flex gap-2 relative">
          <input 
            value={localInput} 
            onChange={(e) => setLocalInput(e.target.value)} 
            className="w-full pl-4 pr-12 py-3 bg-gray-100 border-transparent rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm" 
            placeholder="Hỏi thầy về bài Tụ điện..." 
            disabled={isLoading} 
          />
          <button type="submit" disabled={isLoading || !localInput.trim()} className="absolute right-2 top-2 bottom-2 aspect-square bg-blue-600 text-white rounded-lg flex items-center justify-center hover:bg-blue-700 disabled:opacity-50 transition-colors">
            <Send className="w-4 h-4" />
          </button>
        </div>
      </form>
      
      {!isExpanded && (
        <div onMouseDown={startResize} className="absolute bottom-0 right-0 w-4 h-4 cursor-nw-resize bg-transparent" style={{ clipPath: 'polygon(100% 0, 100% 100%, 0 100%)' }} />
      )}
    </div>
  );
}