import type { Metadata } from "next";
import "./globals.css";
import Chatbot from "@/components/Chatbot";

export const metadata: Metadata = {
  title: "Tụ điện - Vật lí 11",
  description: "Website học tập Tụ điện theo mô hình lớp học đảo ngược",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi">
      <body>
        {children}
        <Chatbot />
      </body>
    </html>
  );
}