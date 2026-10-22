import Link from "next/link";
import { GraduationCap, LayoutDashboard, Sparkles, BookOpen, ChevronRight } from "lucide-react";

export default function HomePage() {
  return (
    <main className="min-h-screen flex items-center justify-center p-6 relative overflow-hidden">
      {/* Background decorations */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-100 rounded-full blur-3xl opacity-50"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-emerald-100 rounded-full blur-3xl opacity-50"></div>
      
      <div className="max-w-4xl w-full text-center space-y-10 relative z-10">
        <div className="space-y-4">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-50 text-blue-700 font-medium text-sm mb-4 border border-blue-100">
            <Sparkles className="w-4 h-4" /> Nền tảng học tập thông minh
          </div>
          <h1 className="text-6xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-700 to-blue-500 mb-3 tracking-tight">Tụ điện</h1>
          <p className="text-xl text-gray-600 font-medium">Vật lí 11 - Lớp học đảo ngược</p>
        </div>

        <div className="grid md:grid-cols-2 gap-6 pt-6">
          <Link href="/hoc-sinh" className="card group flex flex-col items-center text-center p-8 bg-white/80 backdrop-blur-sm border-2 border-transparent hover:border-blue-100">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 text-white flex items-center justify-center mb-6 shadow-lg shadow-blue-200 group-hover:scale-110 transition-transform">
              <GraduationCap className="w-10 h-10" />
            </div>
            <h2 className="text-2xl font-bold mb-2 text-gray-800">Học sinh</h2>
            <p className="text-gray-500 mb-6">Vào làm bài tập, thí nghiệm và chat với trợ lý AI</p>
            <div className="mt-auto flex items-center text-blue-600 font-medium group-hover:gap-2 transition-all">
              Bắt đầu học <ChevronRight className="w-4 h-4" />
            </div>
          </Link>

          <Link href="/giao-vien" className="card group flex flex-col items-center text-center p-8 bg-white/80 backdrop-blur-sm border-2 border-transparent hover:border-emerald-100">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-600 text-white flex items-center justify-center mb-6 shadow-lg shadow-emerald-200 group-hover:scale-110 transition-transform">
              <LayoutDashboard className="w-10 h-10" />
            </div>
            <h2 className="text-2xl font-bold mb-2 text-gray-800">Giáo viên</h2>
            <p className="text-gray-500 mb-6">Xem dashboard, quản lý tiến độ và hỗ trợ học sinh</p>
            <div className="mt-auto flex items-center text-emerald-600 font-medium group-hover:gap-2 transition-all">
              Vào Dashboard <ChevronRight className="w-4 h-4" />
            </div>
          </Link>
        </div>

        <div className="flex justify-center gap-8 pt-8 text-sm font-medium text-gray-400">
          <div className="flex items-center gap-2"><BookOpen className="w-4 h-4" /> 14 Hoạt động</div>
          <div className="flex items-center gap-2"><Sparkles className="w-4 h-4" /> 6 Thí nghiệm ảo</div>
          <div className="flex items-center gap-2"><BotIcon /> AI Chấm điểm</div>
        </div>
      </div>
    </main>
  );
}

function BotIcon() {
  return <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 8V4H8"/><rect width="16" height="12" x="4" y="8" rx="2"/><path d="M2 14h2"/><path d="M20 14h2"/><path d="M15 13v2"/><path d="M9 13v2"/></svg>;
}