import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function POST(req: Request) {
  try {
    const { message } = await req.json();
    if (!message) return NextResponse.json({ error: "Thiếu tin nhắn" }, { status: 400 });

    const response = await ai.models.generateContent({
      model: "gemini-3.8-flash",
      contents: message,
      config: {
        systemInstruction: "Bạn là trợ lý Vật lí AI dạy bài Tụ điện. Trả lời ngắn gọn, thân thiện.",
      }
    });

    return NextResponse.json({ reply: response.text });
  } catch (error: any) {
    console.error("--- LỖI GỌI GEMINI ---", error);
    return NextResponse.json({ error: error.message || "Lỗi không xác định" }, { status: 500 });
  }
}