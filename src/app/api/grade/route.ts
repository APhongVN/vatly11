import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function POST(req: Request) {
  try {
    const { studentAnswer } = await req.json();
    if (!studentAnswer) return NextResponse.json({ error: "Thiếu câu trả lời" }, { status: 400 });

    const prompt = `Bạn là giáo viên Vật lý chấm bài tự luận. Hãy chấm điểm câu trả lời của học sinh về hiện tượng tụ điện phóng điện qua LED.
Rubric (thang điểm 0-2 cho mỗi tiêu chí):
1. Liên hệ hiện tượng (0: không liên hệ, 1: nhắc đến nạp/ngắt nguồn nhưng chưa logic, 2: lập luận từ chuỗi nạp -> ngắt nguồn -> đèn sáng).
2. Ý tưởng tích trữ (0: không đề cập, 1: nêu "có điện còn lại" mơ hồ, 2: nhận ra tụ đã lưu trữ năng lượng trước đó).
Hãy trả về JSON với cấu trúc: {"score": [tổng điểm], "feedback": "[nhận xét chi tiết bằng tiếng Việt]", "confidence": [0-1]}. Chỉ trả về JSON, không kèm văn bản khác.

Câu trả lời của học sinh: "${studentAnswer}"`;

    const response = await ai.models.generateContent({
      model: "gemini-3.8-flash",
      contents: prompt,
    });

    const responseText = response.text || "";
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : { score: 0, feedback: responseText, confidence: 0.5 };

    return NextResponse.json(parsed);
  } catch (error: any) {
    console.error("Gemini Grading Error:", error);
    return NextResponse.json({ error: "Không thể chấm điểm tự động" }, { status: 500 });
  }
}