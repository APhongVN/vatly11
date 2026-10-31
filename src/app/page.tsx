import Link from "next/link";
import { GraduationCap, LayoutDashboard, Sparkles, BookOpen, ChevronRight, Microscope, Bot } from "lucide-react";
import { ACTIVITIES } from "@/lib/data/activities";

const availableActivities = ACTIVITIES.filter((activity) => activity.status === "available").length;

export default function HomePage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white relative overflow-hidden flex flex-col justify-between">
      {/* Background Glows */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-blue-600/20 rounded-full blur-3xl pointer-events-none home-glow"></div>
      <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-indigo-600/20 rounded-full blur-3xl pointer-events-none home-glow"></div>

      {/* Top Navbar */}
      <header className="relative z-10 border-b border-white/10 ">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center font-black shadow-lg shadow-blue-500/30">
              V11
            </div>
            <div>
              <span className="font-black text-lg tracking-wide block">VẬT LÍ 11</span>
              <span className="text-[10px] text-blue-300 font-semibold uppercase tracking-wider">Chuyên đề Tụ điện</span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <Link
              href="/chapters"
              className="px-5 py-2.5 rounded-xl text-xs font-bold bg-white/10 hover:bg-white/20 border border-white/10 transition-all "
            >
              Xem chương học
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <div className="max-w-6xl mx-auto px-6 py-12 md:py-16 text-center space-y-8 relative z-10 my-auto">
        <div className="space-y-4">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-500/10 text-blue-300 font-semibold text-xs border border-blue-500/20 ">
            <Sparkles className="w-4 h-4 text-yellow-300" /> Hệ thống Dạy học Đảo ngược & Chấm điểm AI 2.0
          </div>

          <h1 className="text-4xl md:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-300 via-white to-indigo-200 tracking-tight leading-tight">
            Chuyên Đề Tụ Điện<br className="hidden md:block"/> Vật Lí 11 Thông Minh
          </h1>

          <p className="text-sm md:text-base text-slate-300 font-normal max-w-2xl mx-auto leading-relaxed">
            Nền tảng chuyển đổi số toàn diện theo mô hình <strong>Lớp học đảo ngược (Flipped Classroom)</strong>: Tương tác thí nghiệm ảo, phân tích bài làm bằng AI OCR và trợ lý Gemini giải thích công thức và gợi ý bài tập.
          </p>
        </div>

        {/* Hai cổng vào chính */}
        <div className="grid md:grid-cols-2 gap-6 pt-4 max-w-4xl mx-auto">
          {/* Cổng Học sinh */}
          <Link
            href="/chapters"
            className="group relative bg-white/5 hover:bg-white/10 border border-white/15 hover:border-blue-400/50 p-8 rounded-3xl transition-[transform,background-color,border-color,box-shadow] duration-300 motion-safe:hover:-translate-y-1 text-left portal-enter portal-enter-delay flex flex-col justify-between  shadow-xl hover:shadow-2xl"
          >
            <div>
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center mb-6 shadow-lg shadow-blue-500/30 group-hover:scale-105 transition-transform duration-200">
                <GraduationCap className="w-7 h-7" />
              </div>
              <h2 className="text-2xl font-black mb-2 text-white flex items-center gap-2">
                Khám phá chương Tụ điện <ChevronRight className="w-5 h-5 text-blue-400 group-hover:translate-x-1 transition-transform" />
              </h2>
              <p className="text-xs text-slate-300 leading-relaxed mb-6">
                Làm bài tập chuẩn bị trước khi đến lớp, thực hành trên Phòng thí nghiệm ảo, nộp bài quét ảnh AI OCR và hỏi đáp trợ lý gia sư thông minh.
              </p>
            </div>
            <div className="mt-auto flex items-center text-xs font-bold text-blue-400 group-hover:text-blue-300 transition-colors">
                Xem lộ trình và bài mẫu →
            </div>
          </Link>

          {/* Cổng Giáo viên */}
          <Link href="/giao-vien" className="group relative bg-white/5 hover:bg-white/10 border border-white/15 hover:border-emerald-400/50 p-8 rounded-3xl transition-[transform,background-color,border-color,box-shadow] duration-300 motion-safe:hover:-translate-y-1 text-left portal-enter portal-enter-delay flex flex-col justify-between shadow-xl hover:shadow-2xl">
            <div>
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white flex items-center justify-center mb-6 shadow-lg shadow-emerald-500/30 group-hover:scale-105 transition-transform duration-200">
                <LayoutDashboard className="w-7 h-7" />
              </div>
              <h2 className="text-2xl font-black mb-2 text-white flex items-center gap-2">
                Khu quản lý giáo viên <LayoutDashboard className="w-5 h-5 text-emerald-400" />
              </h2>
              <p className="text-xs text-slate-300 leading-relaxed mb-6">
                Mở bản xem trước bảng điều khiển và các khu vực quản lý. Tài khoản và thao tác ghi dữ liệu chưa mở.
              </p>
            </div>
            <div className="mt-auto flex items-center text-xs font-bold text-emerald-400 group-hover:text-emerald-300 transition-colors">
              Xem trước giao diện giáo viên →
            </div>
          </Link>
        </div>

        {/* 4 Trụ cột tính năng */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-6 max-w-4xl mx-auto text-left">
          <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
            <BookOpen className="w-5 h-5 text-blue-400 mb-2" />
            <h4 className="text-xs font-bold text-white">Lớp học đảo ngược</h4>
            <p className="text-[11px] text-slate-400 mt-0.5">{availableActivities} mẫu tương tác · {ACTIVITIES.length - availableActivities} hoạt động theo lộ trình</p>
          </div>

          <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
            <Microscope className="w-5 h-5 text-purple-400 mb-2" />
            <h4 className="text-xs font-bold text-white">Thí nghiệm ảo</h4>
            <p className="text-[11px] text-slate-400 mt-0.5">Mô phỏng điện dung, điện áp và nạp xả tụ điện</p>
          </div>

          <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
            <Bot className="w-5 h-5 text-emerald-400 mb-2" />
            <h4 className="text-xs font-bold text-white">AI hỗ trợ chấm bài</h4>
            <p className="text-[11px] text-slate-400 mt-0.5">OCR và rubric hỗ trợ giáo viên chấm bài</p>
          </div>

          <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
            <Sparkles className="w-5 h-5 text-amber-400 mb-2" />
            <h4 className="text-xs font-bold text-white">AI Sinh Đề & Báo Cáo</h4>
            <p className="text-[11px] text-slate-400 mt-0.5">Gợi ý câu hỏi và tổng hợp kết quả lớp</p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/10 py-6 text-center text-xs text-slate-400">
        <p>© 2026 Hệ thống Học tập Vật lí 11 - Lớp học đảo ngược • Trường THPT</p>
      </footer>
    </main>
  );
}
