import type { Metadata } from "next";
import "./globals.css";
import "katex/dist/katex.min.css";
import ChatbotLoader from "@/components/ChatbotLoader";

export const metadata: Metadata = {
  title: "Vật lí - Tụ điện",
  description: "Website học tập Tụ điện theo mô hình lớp học đảo ngược",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi">
      <body>
        {children}
        <ChatbotLoader />
      </body>
    </html>
  );
}