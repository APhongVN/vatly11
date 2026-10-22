import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function POST(req: Request) {
  try {
    const { studentAnswer, rubricText } = await req.json();
    if (!studentAnswer) return NextResponse.json({ error: "Thiếu bài làm" }, { status: 400 });

    const systemPrompt = `Bạn là giáo viên chấm bài tự luận. Bạn có MA TRẬN ĐIỂM (chứa các ý, từ khóa, công thức cần có).
Hãy đối chiếu bài làm của sinh viên với ma trận điểm.
Nếu sinh viên có ý đó (dù diễn đạt khác), cho điểm phần đó. 
Nếu bài làm quá khó hiểu hoặc không khớp ý nào, hãy trả về score: -1 để giáo viên tự chấm.
Trả về ĐÚNG định dạng JSON: {"score": [tổng điểm hoặc -1], "feedback": "[nhận xét chi tiết chỉ rõ được ý nào, thiếu ý nào]"}
MA TRẬN ĐIỂM: ${rubricText || "Chấm theo kiến thức Vật lý chuẩn."}
BÀI LÀM CỦA SINH VIÊN: "${studentAnswer}"`;

    const response = await ai.models.generateContent({
      model: "gemini-3.8-flash",
      contents: systemPrompt,
    });

    const responseText = response.text || "";
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : { score: -1, feedback: "Lỗi AI." };

    return NextResponse.json(parsed);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}