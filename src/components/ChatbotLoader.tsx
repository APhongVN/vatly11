"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { Bot } from "lucide-react";

const Chatbot = dynamic(() => import("@/components/Chatbot"), { ssr: false });

export default function ChatbotLoader() {
  const [opened, setOpened] = useState(false);

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