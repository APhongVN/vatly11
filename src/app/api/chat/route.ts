import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function POST(req: Request) {
  try {
    const { messages } = await req.json();
    const latestMessage = messages[messages.length - 1].content;

    const response = await ai.models.generateContent({
      model: "gemini-3.8-flash",
      contents: latestMessage,
      config: { systemInstruction: "Bạn là trợ lý Vật lí AI dạy bài Tụ điện. Trả lời ngắn gọn." }
    });

    return NextResponse.json({ reply: response.text });
  } catch (error: any) {
    return NextResponse.json({ reply: "Lỗi: " + error.message }, { status: 500 });
  }
}