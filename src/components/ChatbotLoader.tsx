"use client";

import dynamic from "next/dynamic";
import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { Bot } from "lucide-react";

const Chatbot = dynamic(() => import("@/components/Chatbot"), { ssr: false });

export default function ChatbotLoader() {
  const [opened, setOpened] = useState(false);
  const pathname = usePathname();

  // Trợ lý AI dùng được cho CẢ học sinh và giáo viên.
  // - Học sinh: chatbot là công cụ AI duy nhất (không có AI chấm điểm).
  // - Giáo viên: chatbot hỗ trợ soạn đề/giải thích, song song các công cụ AI khác trong bảng điều khiển.
  const chatbotPaths = ["/hoc-sinh", "/lam-bai", "/nop-bai", "/phieu-nhom", "/doi-mat-khau", "/giao-vien"];
  const showChatbot = chatbotPaths.some((path) => pathname === path || pathname.startsWith(path + "/"));

  useEffect(() => {
    if (!showChatbot) setOpened(false);
  }, [showChatbot]);

  if (!showChatbot) return null;
  if (opened) return <Chatbot initiallyOpen />;

  return (
    <button
      onClick={() => setOpened(true)}
      aria-label="Mở trợ lý học tập AI"
      className="fixed bottom-4 right-4 z-50 inline-flex items-center gap-2 rounded-2xl bg-blue-700 px-4 py-3 text-sm font-bold text-white shadow-xl shadow-blue-950/20 transition-colors hover:bg-blue-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 sm:bottom-6 sm:right-6"
    >
      <Bot className="h-5 w-5" />
      Hỏi trợ lý AI
    </button>
  );
}