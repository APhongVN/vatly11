"use client";
import { AlertTriangle, Award, BrainCircuit, Lightbulb, Sparkles, TrendingUp } from "lucide-react";

type AnalyticsReport = {
  summary?: string;
  topWeaknesses?: string[];
  flippedClassroomAdvice?: string;
  remedialAction?: string;
} | null;

/**
 * Tab "AI Phân tích & Báo cáo": phổ điểm nhanh + báo cáo lỗ hổng kiến thức do AI tạo.
 */
export default function TeacherAnalyticsTab({
  excellentCount, goodCount, avgCount, weakCount,
  isAnalyzing, report, onRunAnalysis,
}: {
  excellentCount: number;
  goodCount: number;
  avgCount: number;
  weakCount: number;
  isAnalyzing: boolean;
  report: AnalyticsReport;
  onRunAnalysis: () => void;
}) {
  const cards = [
    { label: "Xuất sắc (8 - 10đ)", note: "Nắm vững hiện tượng & công thức", value: excellentCount, border: "border-emerald-100", text: "text-emerald-700", number: "text-emerald-600" },
    { label: "Khá (6.5 - 7.9đ)", note: "Sai sót nhỏ về đơn vị/trình bày", value: goodCount, border: "border-blue-100", text: "text-blue-700", number: "text-blue-600" },
    { label: "Trung bình (5 - 6.4đ)", note: "Cần củng cố cách suy luận", value: avgCount, border: "border-amber-100", text: "text-amber-700", number: "text-amber-600" },
    { label: "Cần hỗ trợ (< 5đ)", note: "Hổng kiến thức cơ bản", value: weakCount, border: "border-rose-100", text: "text-rose-700", number: "text-rose-600" },
  ];

  return (
    <div className="space-y-6 max-w-5xl animate-in fade-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-extrabold text-slate-900 flex items-center gap-2">
            <BrainCircuit className="w-8 h-8 text-indigo-600" /> Báo Cáo Phân Tích Lớp Học AI
          </h2>
          <p className="text-slate-500 text-sm mt-1">Đánh giá phổ điểm, nhận diện 3 lỗ hổng kiến thức phổ biến và đề xuất kế hoạch dạy học đảo ngược trên lớp.</p>
        </div>
        <button
          type="button"
          onClick={onRunAnalysis}
          disabled={isAnalyzing}
          className="px-5 py-3 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white rounded-2xl text-xs font-bold shadow-lg shadow-indigo-500/25 flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50"
        >
          <Sparkles className="w-4 h-4" />
          {isAnalyzing ? "AI đang phân tích toàn bộ lớp…" : "Kích hoạt AI Phân tích Lỗ hổng"}
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {cards.map((card) => (
          <div key={card.label} className={`p-5 rounded-2xl bg-white border ${card.border} shadow-sm`}>
            <span className={`text-xs font-bold ${card.text} uppercase block`}>{card.label}</span>
            <p className={`text-3xl font-extrabold ${card.number} mt-1`}>{card.value}</p>
            <p className="text-[11px] text-slate-400 mt-1">{card.note}</p>
          </div>
        ))}
      </div>

      {report ? (
        <div className="bg-white p-6 md:p-8 rounded-3xl border border-slate-200/90 shadow-sm space-y-6 animate-in fade-in">
          <div className="p-5 rounded-2xl bg-indigo-50/70 border border-indigo-100 space-y-2">
            <h3 className="font-bold text-sm text-indigo-950 flex items-center gap-2"><TrendingUp className="w-4 h-4 text-indigo-600" /> Nhận định năng lực chung của lớp:</h3>
            <p className="text-xs text-slate-700 leading-relaxed">{report.summary}</p>
          </div>
          <div className="space-y-3">
            <h3 className="font-bold text-sm text-slate-800 flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-amber-500" /> Top 3 Lỗ hổng khái niệm học sinh dễ nhầm lẫn:</h3>
            <div className="grid md:grid-cols-3 gap-4">
              {report.topWeaknesses?.map((weakness, index) => (
                <div key={index} className="p-4 rounded-2xl bg-rose-50/50 border border-rose-100 text-xs text-slate-700 space-y-1">
                  <span className="font-bold text-rose-700 block">Lỗ hổng #{index + 1}</span>
                  <p>{weakness}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="grid md:grid-cols-2 gap-5 pt-2">
            <div className="p-5 rounded-2xl bg-emerald-50/60 border border-emerald-100 space-y-2">
              <h4 className="font-bold text-xs text-emerald-950 uppercase tracking-wider flex items-center gap-1.5"><Lightbulb className="w-4 h-4 text-emerald-600" /> Đề xuất hoạt động trên lớp (Flipped Classroom):</h4>
              <p className="text-xs text-slate-700 leading-relaxed">{report.flippedClassroomAdvice}</p>
            </div>
            <div className="p-5 rounded-2xl bg-blue-50/60 border border-blue-100 space-y-2">
              <h4 className="font-bold text-xs text-blue-950 uppercase tracking-wider flex items-center gap-1.5"><Award className="w-4 h-4 text-blue-600" /> Biện pháp bổ trợ học sinh yếu:</h4>
              <p className="text-xs text-slate-700 leading-relaxed">{report.remedialAction}</p>
            </div>
          </div>
        </div>
      ) : (
        <div className="p-12 bg-white rounded-3xl border border-slate-200 text-center space-y-3">
          <BrainCircuit className="w-12 h-12 text-slate-300 mx-auto" />
          <h4 className="text-sm font-bold text-slate-700">Chưa kích hoạt báo cáo AI</h4>
          <p className="text-xs text-slate-400 max-w-md mx-auto">Bấm nút &quot;Kích hoạt AI Phân tích Lỗ hổng&quot; ở góc trên để hệ thống phân tích bài làm của lớp.</p>
        </div>
      )}
    </div>
  );
}