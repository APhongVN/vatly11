"use client";
import { useState, useRef, useEffect } from "react";
import { useChat } from '@ai-sdk/react';

export default function Chatbot() {
  const [open, setOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [size, setSize] = useState({ width: 380, height: 500 });
  const resizingRef = useRef(false);
  const startPosRef = useRef({ x: 0, y: 0, w: 0, h: 0 });

  const { messages, input, handleInputChange, handleSubmit, status } = useChat({ api: '/api/chat' });
  const isLoading = status === 'streaming' || status === 'submitted';

  // Logic kéo để resize
  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (!resizingRef.current) return;
      const dx = startPosRef.current.x - e.clientX;
      const dy = startPosRef.current.y - e.clientY;
      setSize({
        width: Math.max(300, startPosRef.current.w + dx),
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

  if (!open) {
    return <button onClick={() => setOpen(true)} className="fixed bottom-4 right-4 w-14 h-14 rounded-full bg-blue-600 text-white shadow-lg hover:bg-blue-700 z-50">💬</button>;
  }

  const chatStyle = isExpanded 
    ? { position: 'fixed' as const, inset: 0, width: '100%', height: '100%', borderRadius: 0 }
    : { position: 'fixed' as const, bottom: 80, right: 16, width: size.width, height: size.height, borderRadius: 12 };

  return (
    <>
      {!isExpanded && <button onClick={() => setOpen(false)} className="fixed bottom-4 right-4 w-14 h-14 rounded-full bg-blue-600 text-white shadow-lg hover:bg-blue-700 z-50">💬</button>}
      <div style={chatStyle} className="bg-white shadow-2xl border z-50 flex flex-col overflow-hidden">
        <div className="p-3 border-b bg-blue-600 text-white flex justify-between items-center">
          <span className="font-medium">Trợ lý Vật lí AI</span>
          <div className="flex gap-2">
            <button onClick={() => setIsExpanded(!isExpanded)} className="hover:bg-blue-700 px-2 rounded" title={isExpanded ? "Thu nhỏ" : "Phóng to"}>{isExpanded ? "🗗" : "⛶"}</button>
            <button onClick={() => { setOpen(false); setIsExpanded(false); }} className="hover:bg-blue-700 px-2 rounded" title="Đóng">✕</button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {messages.map((m) => (
            <div key={m.id} className={`text-sm p-2 rounded-lg max-w-[85%] ${m.role === "user" ? "bg-blue-100 ml-auto" : "bg-gray-100"}`}>{m.content}</div>
          ))}
          {isLoading && <div className="text-xs text-gray-400 italic">AI đang trả lời...</div>}
        </div>
        <form onSubmit={handleSubmit} className="p-2 border-t flex gap-2">
          <input value={input} onChange={handleInputChange} className="input text-sm" placeholder="Hỏi gì đó..." disabled={isLoading} />
          <button type="submit" disabled={isLoading || !input.trim()} className="btn btn-primary text-sm px-3 disabled:opacity-50">Gửi</button>
        </form>
        {!isExpanded && (
          <div onMouseDown={startResize} className="absolute bottom-0 right-0 w-4 h-4 cursor-nw-resize bg-gray-300" style={{ clipPath: 'polygon(100% 0, 100% 100%, 0 100%)' }} />
        )}
      </div>
    </>
  );
}