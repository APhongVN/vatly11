import Link from "next/link";
import { GraduationCap, LayoutDashboard, Sparkles, BookOpen, ChevronRight, Microscope, Bot, Target, CheckCircle2 } from "lucide-react";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white relative overflow-hidden flex flex-col justify-between">
      {/* Background Glows */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-blue-600/20 rounded-full blur-3xl pointer-events-none home-glow" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-indigo-600/20 rounded-full blur-3xl pointer-events-none home-glow" />

      {/* Top Navbar */}
      <header className="relative z-10 border-b border-white/10 backdrop-blur-md bg-white/[0.02]">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center font-black shadow-lg shadow-blue-500/30">
              VL
            </div>
            <div>
              <span className="font-black text-lg tracking-wide block">VẬT LÍ</span>
              <span className="text-[10px] text-blue-300 font-semibold uppercase tracking-wider">Chuyên đề Tụ điện</span>
            </div>
          </div>

          <nav className="hidden md:flex items-center gap-7 text-xs font-semibold text-slate-300">
            <a href="#muc-tieu" className="hover:text-white transition-colors">Mục tiêu</a>
            <a href="#tin-nang" className="hover:text-white transition-colors">Tính năng</a>
            <a href="#huong-dan" className="hover:text-white transition-colors">Hướng dẫn</a>
          </nav>

          <div className="flex items-center gap-3">
            <Link
              href="/hoc-sinh"
              className="px-5 py-2.5 rounded-xl text-xs font-bold bg-white/10 hover:bg-white/20 border border-white/10 transition-all"
            >
              Vào lớp học
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <div className="max-w-6xl mx-auto px-6 py-12 md:py-16 text-center space-y-8 relative z-10 my-auto">
        <div className="space-y-4">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-500/10 text-blue-300 font-semibold text-xs border border-blue-500/20">
            <Sparkles className="w-4 h-4 text-amber-300" /> Hệ thống Dạy học Đảo ngược &amp; Chấm điểm AI
          </div>

          <h1 className="text-4xl md:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-300 via-white to-indigo-200 tracking-tight leading-tight">
            Chuyên Đề Tụ Điện<br className="hidden md:block" /> Vật Lí Thông Minh
          </h1>

          <p className="text-sm md:text-base text-slate-300 font-normal max-w-2xl mx-auto leading-relaxed">
            Nền tảng chuyển đổi số theo mô hình <strong>Lớp học đảo ngược (Flipped Classroom)</strong>: tương tác thí nghiệm ảo, phân tích bài làm bằng AI OCR và trợ lý ảo giải thích công thức, gợi ý bài tập.
          </p>
        </div>

        {/* Dải thống kê nhanh */}
        <div className="flex flex-wrap justify-center gap-3 md:gap-4 pt-2 text-left">
          <div className="inline-flex items-center gap-2 rounded-2xl bg-white/5 border border-white/10 px-4 py-2.5">
            <BookOpen className="w-4 h-4 text-blue-400" />
            <span className="text-xs font-bold">14 mục đề cương</span>
          </div>
          <div className="inline-flex items-center gap-2 rounded-2xl bg-white/5 border border-white/10 px-4 py-2.5">
            <Target className="w-4 h-4 text-indigo-400" />
            <span className="text-xs font-bold">11 hoạt động học tập</span>
          </div>
          <div className="inline-flex items-center gap-2 rounded-2xl bg-white/5 border border-white/10 px-4 py-2.5">
            <Bot className="w-4 h-4 text-emerald-400" />
            <span className="text-xs font-bold">AI chấm &amp; sinh đề</span>
          </div>
          <div className="inline-flex items-center gap-2 rounded-2xl bg-white/5 border border-white/10 px-4 py-2.5">
            <Microscope className="w-4 h-4 text-blue-400" />
            <span className="text-xs font-bold">Phòng thí nghiệm ảo</span>
          </div>
        </div>

        {/* Hai cổng vào chính */}
        <div className="grid md:grid-cols-2 gap-6 pt-4 max-w-4xl mx-auto">
          {/* Cổng Học sinh */}
          <Link
            href="/hoc-sinh"
            className="group relative bg-white/5 hover:bg-white/10 border border-white/15 hover:border-blue-400/50 p-8 rounded-3xl transition-[transform,background-color,border-color,box-shadow] duration-300 motion-safe:hover:-translate-y-1 text-left portal-enter portal-enter-delay flex flex-col justify-between  shadow-xl hover:shadow-2xl"
          >
            <div>
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center mb-6 shadow-lg shadow-blue-500/30 group-hover:scale-105 transition-transform duration-200">
                <GraduationCap className="w-7 h-7" />
              </div>
              <h2 className="text-2xl font-black mb-2 text-white flex items-center gap-2">
                Không gian học tập học sinh <ChevronRight className="w-5 h-5 text-blue-400 group-hover:translate-x-1 transition-transform" />
              </h2>
              <p className="text-xs text-slate-300 leading-relaxed mb-6">
                Mở 11 hoạt động học, đọc tài liệu chi tiết, làm thí nghiệm ảo và tự kiểm tra kiến thức.
              </p>
            </div>
            <div className="mt-auto flex items-center text-xs font-bold text-blue-400 group-hover:text-blue-300 transition-colors">
                Vào lớp học →
            </div>
          </Link>

          {/* Cổng Giáo viên */}
          <Link href="/giao-vien" className="group relative bg-white/5 hover:bg-white/10 border border-white/15 hover:border-emerald-400/50 p-8 rounded-3xl transition-[transform,background-color,border-color,box-shadow] duration-300 motion-safe:hover:-translate-y-1 text-left portal-enter portal-enter-delay flex flex-col justify-between shadow-xl hover:shadow-2xl">
            <div>
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-600 text-white flex items-center justify-center mb-6 shadow-lg shadow-emerald-500/30 group-hover:scale-105 transition-transform duration-200">
                <LayoutDashboard className="w-7 h-7" />
              </div>
              <h2 className="text-2xl font-black mb-2 text-white flex items-center gap-2">
                Khu quản lý giáo viên <LayoutDashboard className="w-5 h-5 text-emerald-400" />
              </h2>
              <p className="text-xs text-slate-300 leading-relaxed mb-6">
                Cổng quản lý lớp học, học liệu, hoạt động, bài nộp và báo cáo dành cho giáo viên.
              </p>
            </div>
            <div className="mt-auto flex items-center text-xs font-bold text-emerald-400 group-hover:text-emerald-300 transition-colors">
              Đến cổng giáo viên →
            </div>
          </Link>
        </div>

        {/* 4 Trụ cột tính năng */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-6 max-w-4xl mx-auto text-left">
          <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
            <BookOpen className="w-5 h-5 text-blue-400 mb-2" />
            <h4 className="text-xs font-bold text-white">Lớp học đảo ngược</h4>
            <p className="text-[11px] text-slate-400 mt-0.5">14 mục đề cương · 11 hoạt động sau khi gộp các mục 8–11</p>
          </div>

          <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
            <Microscope className="w-5 h-5 text-indigo-400 mb-2" />
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
            <h4 className="text-xs font-bold text-white">AI Sinh Đề &amp; Báo Cáo</h4>
            <p className="text-[11px] text-slate-400 mt-0.5">Gợi ý câu hỏi và tổng hợp kết quả lớp</p>
          </div>
        </div>
      </div>

      {/* Mục tiêu học tập */}
      <section id="muc-tieu" className="relative z-10 border-t border-white/10 bg-white/[0.02]">
        <div className="max-w-5xl mx-auto px-6 py-12">
          <h2 className="text-center text-2xl md:text-3xl font-black mb-2">Mục tiêu học tập</h2>
          <p className="text-center text-xs text-slate-400 mb-8">Sau bài học, học sinh hiểu cấu tạo tụ điện, điện dung, năng lượng và biết vận dụng vào thiết bị thực tế.</p>
          <div className="grid sm:grid-cols-2 gap-4 max-w-3xl mx-auto">
            <div className="flex gap-3 rounded-2xl bg-white/5 border border-white/10 p-4">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <h3 className="text-xs font-bold mb-1">Cấu tạo &amp; nguyên lí</h3>
                <p className="text-[11px] text-slate-400 leading-relaxed">Nêu được cấu tạo tụ điện; giải thích quá trình tích điện và phóng điện.</p>
              </div>
            </div>
            <div className="flex gap-3 rounded-2xl bg-white/5 border border-white/10 p-4">
              <CheckCircle2 className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
              <div>
                <h3 className="text-xs font-bold mb-1">Điện dung &amp; yếu tố ảnh hưởng</h3>
                <p className="text-[11px] text-slate-400 leading-relaxed">Xác định các yếu tố làm thay đổi điện dung; tính toán điện dung tương đương khi ghép tụ.</p>
              </div>
            </div>
            <div className="flex gap-3 rounded-2xl bg-white/5 border border-white/10 p-4">
              <CheckCircle2 className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
              <div>
                <h3 className="text-xs font-bold mb-1">Năng lượng tụ điện</h3>
                <p className="text-[11px] text-slate-400 leading-relaxed">Tính và giải thích năng lượng điện trường tích trữ trong tụ.</p>
              </div>
            </div>
            <div className="flex gap-3 rounded-2xl bg-white/5 border border-white/10 p-4">
              <CheckCircle2 className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <h3 className="text-xs font-bold mb-1">Vận dụng &amp; thực hành</h3>
                <p className="text-[11px] text-slate-400 leading-relaxed">Thao tác trên phòng thí nghiệm ảo và nhận xét ứng dụng của tụ điện trong thiết bị.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Hướng dẫn 3 bước */}
      <section id="huong-dan" className="relative z-10 border-t border-white/10 bg-white/[0.02]">
        <div className="max-w-5xl mx-auto px-6 py-12">
          <h2 className="text-center text-2xl md:text-3xl font-black mb-8">Bắt đầu trong 3 bước</h2>
          <div className="grid md:grid-cols-3 gap-5">
            <div className="rounded-2xl bg-white/5 border border-white/10 p-6">
              <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center font-black text-sm mb-4">1</div>
              <h3 className="font-bold text-sm mb-1.5">Đăng nhập</h3>
              <p className="text-[11px] text-slate-400 leading-relaxed">Học sinh chọn lớp rồi chọn tên mình; giáo viên dùng email đã được cấp quyền.</p>
            </div>
            <div className="rounded-2xl bg-white/5 border border-white/10 p-6">
              <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center font-black text-sm mb-4">2</div>
              <h3 className="font-bold text-sm mb-1.5">Học &amp; thực hành</h3>
              <p className="text-[11px] text-slate-400 leading-relaxed">Xem video hướng dẫn, thao tác phòng thí nghiệm ảo và làm bài tập theo từng hoạt động.</p>
            </div>
            <div className="rounded-2xl bg-white/5 border border-white/10 p-6">
              <div className="w-9 h-9 rounded-xl bg-emerald-600 flex items-center justify-center font-black text-sm mb-4">3</div>
              <h3 className="font-bold text-sm mb-1.5">Nhận phản hồi</h3>
              <p className="text-[11px] text-slate-400 leading-relaxed">Giáo viên chấm và nhận xét; học sinh xem điểm, đáp án mẫu và đặt câu hỏi thắc mắc.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/10 py-6 text-center text-xs text-slate-400">
        <p>© 2026 Hệ thống Học tập Vật lí - Lớp học đảo ngược • Trường THPT</p>
      </footer>
    </main>
  );
}
