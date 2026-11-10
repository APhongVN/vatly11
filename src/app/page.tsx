import Link from "next/link";
import {
  GraduationCap, LayoutDashboard, Sparkles, BookOpen, ChevronRight, Microscope,
  Bot, Target, CheckCircle2, Zap, BatteryCharging, Waves, Gauge, ArrowRight,
} from "lucide-react";
import { CapacitorIcon } from "@/components/home/PhysicsIllustrations";
import HomeParallax from "@/components/home/HomeParallax";
import HomeReveal from "@/components/home/HomeReveal";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-slate-950 text-white relative overflow-x-hidden">
      {/* NEN: anh sang + luoi ky thuat */}
      <div className="pointer-events-none absolute inset-0 z-0">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(59,130,246,0.16),transparent_55%)]" />
        <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[900px] h-[600px] bg-blue-600/20 rounded-full blur-[140px]" />
        <div className="absolute top-[45%] -left-40 w-[500px] h-[500px] bg-indigo-600/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 -right-40 w-[500px] h-[500px] bg-cyan-500/10 rounded-full blur-[120px]" />
        <div className="absolute inset-0 opacity-[0.06] bg-[linear-gradient(to_right,#94a3b8_1px,transparent_1px),linear-gradient(to_bottom,#94a3b8_1px,transparent_1px)] bg-[size:44px_44px]" />
      </div>

      {/* THANH DIEU HUONG */}
      <header className="sticky top-0 z-50 border-b border-white/10 bg-slate-950/70 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-5 md:px-8 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <div className="relative w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-600/30">
              <CapacitorIcon className="w-5 h-5 text-white" />
            </div>
            <div className="leading-none">
              <span className="font-black tracking-wide text-base">KHÁM PHÁ VẬT LÝ</span>
              <span className="block text-[9px] text-blue-400 font-semibold uppercase tracking-widest mt-1">Thông minh · Tương tác</span>
            </div>
          </Link>

          <nav className="hidden md:flex items-center gap-8 text-xs font-semibold text-slate-300">
            <a href="#muc-tieu" className="hover:text-white transition-colors">Mục tiêu</a>
            <a href="#tin-nang" className="hover:text-white transition-colors">Tính năng</a>
            <a href="#thong-so" className="hover:text-white transition-colors">Thống kê</a>
            <a href="#huong-dan" className="hover:text-white transition-colors">Hướng dẫn</a>
          </nav>

          <div className="flex items-center gap-2.5">
            <Link href="/hoc-sinh" className="hidden sm:inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold text-slate-200 border border-white/15 hover:bg-white/10 transition-all">
              Vào lớp học
            </Link>
            <Link href="/giao-vien" className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/30 transition-all">
              <LayoutDashboard className="w-3.5 h-3.5" /> Cổng giáo viên
            </Link>
          </div>
        </div>
      </header>

      <HomeReveal>
      {/* HERO */}
      <section className="relative z-10 max-w-7xl mx-auto px-5 md:px-8 pt-14 md:pt-20 pb-16">
        <div className="grid lg:grid-cols-[1.05fr_0.95fr] gap-12 items-center">
          <div className="space-y-7">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/25 text-blue-300 text-[11px] font-bold tracking-wide">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-400" />
              </span>
              HỆ THỐNG DẠY HỌC ĐẢO NGƯỢC &amp; CHẤM ĐIỂM AI
            </div>

            <h1 className="text-4xl md:text-6xl font-black leading-[1.08] tracking-tight">
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-300 via-white to-cyan-200">Khám phá Vật lý</span>
              <br />
              <span className="text-slate-100">Thông minh · Tương tác · AI</span>
            </h1>

            <p className="text-sm md:text-[15px] text-slate-400 leading-relaxed max-w-xl">
              Nền tảng khám phá <strong className="text-slate-200">Vật lý</strong> theo mô hình
              <strong className="text-slate-200"> lớp học đảo ngược</strong>: thí nghiệm ảo tương tác,
              chấm bài bằng AI, và trợ lý ảo giải thích hiện tượng — giúp học sinh hiểu bản chất
              vật lý thay vì chỉ thuộc công thức.
            </p>

            <div className="flex flex-wrap gap-6 pt-1">
              {[
                { value: "14", label: "Mục đề cương" },
                { value: "11", label: "Hoạt động" },
                { value: "AI", label: "Chấm &amp; sinh đề" },
                { value: "24/7", label: "Học mọi lúc" },
              ].map((stat) => (
                <div key={stat.label} className="space-y-0.5">
                  <p className="text-2xl md:text-3xl font-black text-white tabular-nums" dangerouslySetInnerHTML={{ __html: stat.value }} />
                  <p className="text-[10px] uppercase tracking-widest text-slate-500 font-semibold" dangerouslySetInnerHTML={{ __html: stat.label }} />
                </div>
              ))}
            </div>

            <div className="flex flex-wrap gap-3 pt-2">
              <Link href="/hoc-sinh" className="shine group inline-flex items-center gap-2 px-6 py-3.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-sm font-bold shadow-xl shadow-blue-600/30 transition-all">
                <GraduationCap className="w-4 h-4" />
                Vào lớp học
                <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </Link>
              <Link href="/giao-vien" className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/15 text-sm font-bold text-slate-100 transition-all">
                <LayoutDashboard className="w-4 h-4 text-emerald-400" />
                Khu quản lý giáo viên
              </Link>
            </div>

            <p className="text-[11px] text-slate-500 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              Học sinh chọn lớp → chọn tên → nhập mật khẩu do giáo viên cấp
            </p>
          </div>

          {/* Cot phai: doi mat vector duong net vat ly — khong dung anh */}
          <div className="relative">
            {/* duong net song dien tu phia sau */}
            <div className="physics-lines absolute -inset-x-16 -inset-y-10 opacity-70 pointer-events-none hidden md:block" aria-hidden="true" />
            <HomeParallax strength={16}>
              <div className="relative">
                {/* aura glow */}
                <div className="absolute -inset-6 rounded-[2.5rem] bg-gradient-to-tr from-blue-600/25 via-indigo-500/15 to-cyan-400/25 blur-3xl" aria-hidden="true" />
                {/* do mat duong suc dien truong — vector line-art, khong khung */}
                <svg viewBox="0 0 460 440" className="relative w-full max-w-[460px] h-auto drop-shadow-[0_0_40px_rgba(59,130,246,0.35)]" aria-hidden="true">
                  <defs>
                    <linearGradient id="fluxA" x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0" stopColor="#38bdf8" />
                      <stop offset="1" stopColor="#6366f1" />
                    </linearGradient>
                    <linearGradient id="fluxB" x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0" stopColor="#f59e0b" />
                      <stop offset="1" stopColor="#ef4444" />
                    </linearGradient>
                    <radialGradient id="nodeGlow" cx="0.5" cy="0.5" r="0.5">
                      <stop offset="0" stopColor="#fbbf24" stopOpacity="0.9" />
                      <stop offset="1" stopColor="#fbbf24" stopOpacity="0" />
                    </radialGradient>
                  </defs>
                  {/* hai bien tu */}
                  <rect x="70" y="170" width="20" height="120" rx="4" className="fill-cyan-400/90" />
                  <rect x="112" y="170" width="20" height="120" rx="4" className="fill-cyan-400/90" />
                  <text x="80" y="160" className="fill-cyan-300 text-[15px] font-bold" textAnchor="middle">+</text>
                  <text x="80" y="312" className="fill-cyan-300 text-[15px] font-bold" textAnchor="middle">+</text>
                  <rect x="328" y="170" width="20" height="120" rx="4" className="fill-amber-400/90" />
                  <rect x="370" y="170" width="20" height="120" rx="4" className="fill-amber-400/90" />
                  <text x="380" y="160" className="fill-amber-300 text-[15px] font-bold" textAnchor="middle">−</text>
                  <text x="380" y="312" className="fill-amber-300 text-[15px] font-bold" textAnchor="middle">−</text>
                  {/* duong suc dien truong giua hai ban */}
                  <g className="stroke-blue-400/70" strokeWidth="2" fill="none" strokeLinecap="round">
                    <path d="M132 190 C 200 178, 260 178, 328 190" />
                    <path d="M132 215 C 200 205, 260 205, 328 215" />
                    <path d="M132 230 L 328 230" />
                    <path d="M132 245 C 200 255, 260 255, 328 245" />
                    <path d="M132 270 C 200 282, 260 282, 328 270" />
                  </g>
                  {/* dau mũi tuc cho duong suc */}
                  <g className="fill-blue-400/80">
                    <path d="M328 184 L322 190 L328 196 Z" />
                    <path d="M328 209 L322 215 L328 221 Z" />
                    <path d="M328 224 L322 230 L328 236 Z" />
                    <path d="M328 239 L322 245 L328 251 Z" />
                    <path d="M328 264 L322 270 L328 276 Z" />
                  </g>
                  {/* nuoc dien truong phan roi (vector) */}
                  <g className="stroke-amber-400/50" strokeWidth="1.5" fill="none" strokeLinecap="round">
                    <path d="M348 230 L404 210" />
                    <path d="M348 230 L404 250" />
                    <path d="M348 230 L398 178" />
                    <path d="M348 230 L398 282" />
                  </g>
                  <g className="fill-amber-400/60">
                    <path d="M404 208 L398 214 L406 214 Z" />
                    <path d="M404 252 L398 246 L406 246 Z" />
                  </g>
                  {/* nhan dien tich tren mat trong */}
                  <g className="fill-white/80">
                    <circle cx="112" cy="185" r="2.5" />
                    <circle cx="112" cy="205" r="2.5" />
                    <circle cx="112" cy="225" r="2.5" />
                    <circle cx="112" cy="245" r="2.5" />
                    <circle cx="112" cy="265" r="2.5" />
                  </g>
                  <g className="fill-amber-200/80">
                    <circle cx="328" cy="185" r="2.5" />
                    <circle cx="328" cy="205" r="2.5" />
                    <circle cx="328" cy="225" r="2.5" />
                    <circle cx="328" cy="245" r="2.5" />
                    <circle cx="328" cy="265" r="2.5" />
                  </g>
                  {/* nhan nuoc dien - glow */}
                  <circle cx="348" cy="230" r="14" className="fill-[url(#nodeGlow)]" />
                  {/* goi chung C = eS/4pkd */}
                  <g className="fill-white/70 text-[13px] font-mono" >
                    <text x="230" y="345" textAnchor="middle">C = εS / 4πkd</text>
                  </g>
                  <g className="fill-cyan-200/80 text-[11px] font-mono">
                    <text x="230" y="366" textAnchor="middle">E = k·Q/d²  ·  W = ½CU²</text>
                  </g>
                </svg>
                {/* chip cong thuc noi (vector, khong khung anh) */}
                <div className="mt-5 glass-strong rounded-2xl px-4 py-3 inline-flex items-center gap-2.5 shadow-lg">
                  <Zap className="w-4 h-4 text-cyan-300" />
                  <span className="text-[11px] font-bold text-slate-100 tracking-wide">Đường sức điện trường · mô phỏng 3D trực quan</span>
                </div>
              </div>
            </HomeParallax>
          </div>
        </div>
      </section>

      {/* TINH NANG */}
      <section id="tin-nang" className="relative z-10 border-y border-white/10 bg-white/[0.02]">
        <div className="max-w-7xl mx-auto px-5 md:px-8 py-16">
          <div className="max-w-2xl mb-10 reveal">
            <p className="text-[11px] font-bold uppercase tracking-widest text-blue-400 mb-2">Tính năng nổi bật</p>
            <h2 className="text-2xl md:text-4xl font-black">Một hệ thống, đầy đủ cho lớp học</h2>
            <p className="text-sm text-slate-400 mt-3 leading-relaxed">
              Từ chuẩn bị bài dạy đến chấm điểm và báo cáo — mọi hoạt động được số hóa trên cùng một nền tảng.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { icon: BookOpen, tone: "from-blue-500 to-blue-600", title: "Lộ trình đề cương", desc: "14 mục đề cương được tổ chức thành 11 hoạt động học tập, bám sát chuyên đề Tụ điện." },
              { icon: Microscope, tone: "from-indigo-500 to-indigo-600", title: "Phòng thí nghiệm ảo", desc: "Mô phỏng PhET Capacitor Lab: thay đổi diện tích, khoảng cách, điện môi và quan sát đường sức điện trường." },
              { icon: Bot, tone: "from-emerald-500 to-emerald-600", title: "AI chấm &amp; sinh đề", desc: "OCR đọc bài viết tay, chấm theo ma trận rubric, tự sinh câu hỏi và tổng hợp báo cáo lớp." },
              { icon: Waves, tone: "from-cyan-500 to-cyan-600", title: "Học tập tương tác", desc: "Câu hỏi checkpoint trong video, thẻ bình chọn, thảo luận theo cặp và hoạt động trải nghiệm trên lớp." },
              { icon: Target, tone: "from-amber-500 to-amber-600", title: "Theo dõi tiến độ", desc: "Đúng lần đầu, đúng sau gợi ý, số lần dùng gợi ý và nội dung cần ôn — tất cả từ dữ liệu thật." },
              { icon: Sparkles, tone: "from-violet-500 to-violet-600", title: "Hỏi đáp &amp; hỗ trợ", desc: "Góc hỏi đáp có chủ đề, trạng thái xử lý rõ ràng; trợ lý AI gợi ý trước khi giáo viên phản hồi chính thức." },
            ].map((f, idx) => (
              <div key={f.title} className={`reveal reveal-d${(idx % 3) + 1} group glass rounded-2xl p-5 hover:bg-white/[0.08] hover:border-white/25 hover:-translate-y-1 transition-all duration-300`}>
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${f.tone} flex items-center justify-center mb-4 shadow-lg group-hover:scale-110 group-hover:rotate-3 transition-transform`}>
                  <f.icon className="w-5 h-5 text-white" />
                </div>
                <h3 className="font-bold text-sm mb-1.5" dangerouslySetInnerHTML={{ __html: f.title }} />
                <p className="text-xs text-slate-400 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* MUC TIEU HOC TAP */}
      <section id="muc-tieu" className="relative z-10 max-w-7xl mx-auto px-5 md:px-8 py-16">
        <div className="max-w-2xl mb-10 reveal">
          <p className="text-[11px] font-bold uppercase tracking-widest text-blue-400 mb-2">Mục tiêu học tập</p>
          <h2 className="text-2xl md:text-4xl font-black">Sau bài học, học sinh làm được gì?</h2>
        </div>

          <div className="grid sm:grid-cols-2 gap-4">
            {[
              { icon: CapacitorIcon, tone: "text-blue-400", title: "Cấu tạo &amp; nguyên lí", desc: "Nêu được cấu tạo tụ điện gồm hai vật dẫn ngăn cách bởi môi trường cách điện; giải thích quá trình tích điện và phóng điện." },
            { icon: Gauge, tone: "text-indigo-400", title: "Điện dung &amp; yếu tố ảnh hưởng", desc: "Xác định các yếu tố làm thay đổi điện dung (S, d, εr); tính toán điện dung tương đương khi ghép tụ nối tiếp và song song." },
            { icon: BatteryCharging, tone: "text-emerald-400", title: "Năng lượng tụ điện", desc: "Tính và giải thích năng lượng điện trường tích trữ trong tụ theo công thức W = ½CU²." },
            { icon: Microscope, tone: "text-amber-400", title: "Vận dụng &amp; thực hành", desc: "Thao tác trên phòng thí nghiệm ảo, đo hiệu điện thế và nhận xét ứng dụng của tụ điện trong thiết bị thực tế." },
          ].map((item, idx) => (
            <div key={item.title} className={`reveal reveal-d${(idx % 2) + 1} group flex gap-4 glass rounded-2xl p-5 hover:border-white/25 hover:-translate-y-1 transition-all duration-300`}>
              <div className="shrink-0 w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                <item.icon className={`w-5 h-5 ${item.tone}`} />
              </div>
              <div>
                <h3 className="font-bold text-sm mb-1.5" dangerouslySetInnerHTML={{ __html: item.title }} />
                <p className="text-xs text-slate-400 leading-relaxed">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
      {/* THONG KE */}
      <section id="thong-so" className="relative z-10 border-y border-white/10 bg-gradient-to-r from-blue-600/10 via-transparent to-indigo-600/10">
        <div className="max-w-7xl mx-auto px-5 md:px-8 py-14">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            {[
              { value: "14", label: "Mục đề cương" },
              { value: "11", label: "Hoạt động học tập" },
              { value: "AI", label: "Chấm &amp; sinh đề" },
              { value: "100%", label: "Dữ liệu thật" },
            ].map((s) => (
              <div key={s.label} className="space-y-1.5">
                <p className="text-3xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-300 to-cyan-200 tabular-nums" dangerouslySetInnerHTML={{ __html: s.value }} />
                <p className="text-[10px] md:text-[11px] uppercase tracking-widest text-slate-400 font-semibold" dangerouslySetInnerHTML={{ __html: s.label }} />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* HUONG DAN 3 BUOC */}
      <section id="huong-dan" className="relative z-10 max-w-7xl mx-auto px-5 md:px-8 py-16">
        <div className="max-w-2xl mb-10">
          <p className="text-[11px] font-bold uppercase tracking-widest text-blue-400 mb-2">Hướng dẫn</p>
          <h2 className="text-2xl md:text-4xl font-black">Bắt đầu trong 3 bước</h2>
        </div>
        <div className="grid md:grid-cols-3 gap-4">
          {[
            { step: "01", tone: "from-blue-500 to-blue-600", title: "Đăng nhập", desc: "Học sinh chọn lớp của mình rồi chọn tên; giáo viên dùng email đã được cấp quyền." },
            { step: "02", tone: "from-indigo-500 to-indigo-600", title: "Học &amp; thực hành", desc: "Xem video hướng dẫn, thao tác phòng thí nghiệm ảo và làm bài tập theo từng hoạt động." },
            { step: "03", tone: "from-emerald-500 to-emerald-600", title: "Nhận phản hồi", desc: "Giáo viên chấm và nhận xét; học sinh xem điểm, đáp án mẫu và đặt câu hỏi thắc mắc." },
          ].map((s, idx) => (
            <div key={s.step} className={`reveal reveal-d${idx+1} relative rounded-2xl glass p-6 overflow-hidden`}>
              <span className={`absolute -top-3 -right-1 text-7xl font-black bg-gradient-to-br ${s.tone} bg-clip-text text-transparent opacity-15 select-none`}>{s.step}</span>
              <div className={`relative w-10 h-10 rounded-xl bg-gradient-to-br ${s.tone} flex items-center justify-center mb-4 shadow-lg`}>
                <span className="text-sm font-black">{s.step}</span>
              </div>
              <h3 className="relative font-bold text-base mb-2" dangerouslySetInnerHTML={{ __html: s.title }} />
              <p className="relative text-xs text-slate-400 leading-relaxed">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>
      {/* KEU GOI HANH DONG */}
      <section className="relative z-10 max-w-7xl mx-auto px-5 md:px-8 pb-20">
        <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-r from-blue-600/20 via-indigo-600/20 to-blue-600/20 p-10 md:p-14 text-center">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(59,130,246,0.15),transparent_70%)]" />
          <div className="relative space-y-5">
            <h2 className="text-2xl md:text-4xl font-black">Sẵn sàng bước vào lớp học?</h2>
            <p className="text-sm text-slate-300 max-w-xl mx-auto leading-relaxed">
              Tham gia ngay hôm nay để khám phá vật lý theo cách mới — tương tác, trực quan và được AI hỗ trợ từng bước.
            </p>
            <div className="flex flex-wrap justify-center gap-3 pt-2">
              <Link href="/hoc-sinh" className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl bg-white text-slate-900 text-sm font-bold hover:bg-slate-100 shadow-xl transition-all">
                <GraduationCap className="w-4 h-4" /> Vào lớp học
              </Link>
              <Link href="/giao-vien" className="shine inline-flex items-center gap-2 px-6 py-3.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-sm font-bold transition-all">
                <LayoutDashboard className="w-4 h-4" /> Cổng giáo viên
              </Link>
            </div>
          </div>
        </div>
      </section>
      </HomeReveal>
      {/* FOOTER */}
      <footer className="relative z-10 border-t border-white/10 bg-slate-950/80">
        <div className="max-w-7xl mx-auto px-5 md:px-8 py-10">
          <div className="grid md:grid-cols-3 gap-8 mb-8">
            <div className="space-y-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                  <CapacitorIcon className="w-4 h-4 text-white" />
                </div>
                <div className="leading-none">
                  <span className="font-black text-sm">KHÁM PHÁ VẬT LÝ</span>
                  <span className="block text-[9px] text-blue-400 font-semibold uppercase tracking-widest mt-0.5">Thông minh · Tương tác</span>
                </div>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed">
                Nền tảng khám phá Vật lý theo mô hình lớp học đảo ngược với trợ lý AI và phòng thí nghiệm ảo.
              </p>
            </div>
            <div className="space-y-2.5">
              <h4 className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Học tập</h4>
              <ul className="space-y-2 text-xs text-slate-500">
                <li><Link href="/hoc-sinh" className="hover:text-white transition-colors">Vào lớp học</Link></li>
                <li><a href="#muc-tieu" className="hover:text-white transition-colors">Mục tiêu học tập</a></li>
                <li><a href="#tin-nang" className="hover:text-white transition-colors">Tính năng</a></li>
              </ul>
            </div>
            <div className="space-y-2.5">
              <h4 className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Giáo viên</h4>
              <ul className="space-y-2 text-xs text-slate-500">
                <li><Link href="/giao-vien" className="hover:text-white transition-colors">Cổng giáo viên</Link></li>
                <li><a href="#huong-dan" className="hover:text-white transition-colors">Hướng dẫn sử dụng</a></li>
                <li><a href="#thong-so" className="hover:text-white transition-colors">Thống kê lớp</a></li>
              </ul>
            </div>
          </div>
          <div className="pt-6 border-t border-white/10 flex flex-col md:flex-row items-center justify-between gap-3 text-[11px] text-slate-500">
            <p>© 2026 Khám phá Vật lý — Lớp học đảo ngược</p>
            <p>Tương tác · Trực quan · AI hỗ trợ</p>
          </div>
        </div>
      </footer>
    </main>
  );
}
