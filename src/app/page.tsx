import Link from "next/link";
import {
  GraduationCap, LayoutDashboard, Sparkles, BookOpen, ChevronRight, Microscope,
  Bot, Target, CheckCircle2, Zap, BatteryCharging, Waves, Gauge, ArrowRight,
  Sigma, Atom, ShieldCheck, Timer, Users, Mail, Github, Play, BarChart,
} from "lucide-react";
import { CapacitorIcon, CapacitorDiagram, CircuitDiagram } from "@/components/home/PhysicsIllustrations";
import HomeReveal from "@/components/home/HomeReveal";

const TOPICS = [
  { icon: Target, title: "Cấu tạo & nguyên lí", desc: "Hai bản tụ, điện môi, tích điện và phóng điện." },
  { icon: Gauge, title: "Điện dung", desc: "C = εS / 4πkd và bộ tụ ghép nối tiếp, song song." },
  { icon: BatteryCharging, title: "Năng lượng", desc: "Năng lượng điện trường tích trữ trong tụ." },
  { icon: Bot, title: "Vận dụng & AI", desc: "Ứng dụng thực tế, câu hỏi củng cố có AI hỗ trợ." },
];

const FEATURES = [
  { icon: Microscope, title: "Mô phỏng & thí nghiệm ảo", desc: "Thao tác trực tiếp trên phòng thí nghiệm ảo: thay đổi điện áp, khoảng cách, diện tích bản tụ và quan sát kết quả tức thì." },
  { icon: BookOpen, title: "Video tương tác", desc: "Video dừng đúng lúc ở các đoạn quan trọng, đặt câu hỏi rồi mới cho tiếp tục — không học thụ động." },
  { icon: Sparkles, title: "AI chấm tự luận", desc: "AI đánh giá theo ý kiến thức, đưa gợi ý hướng dẫn chứ không công bố ngay đáp án. Giáo viên duyệt và sửa được." },
  { icon: Bot, title: "Trợ lý Vật lí", desc: "Chatbot trả lời theo đúng học liệu đã duyệt, đọc được ảnh và tài liệu đính kèm, lưu hội thoại 3 giờ." },
  { icon: BarChart, title: "Theo dõi kết quả thật", desc: "Số câu làm, đúng ngay lần đầu, số lần dùng gợi ý — lấy từ dữ liệu thực, không có số liệu mẫu." },
  { icon: ShieldCheck, title: "Phân quyền & an toàn", desc: "Học sinh chỉ thấy dữ liệu của mình và nhóm mình; giáo viên quản lý toàn lớp theo đúng quyền." },
];

const STEPS = [
  { icon: Play, title: "Đăng nhập lớp học", desc: "Học sinh nhập username và mật khẩu được giáo viên cấp, chọn đúng lớp." },
  { icon: Microscope, title: "Học & thực hành", desc: "Xem video, trả lời câu hỏi, làm thí nghiệm ảo và hoàn thành phiếu học tập." },
  { icon: CheckCircle2, title: "Nhận phản hồi", desc: "AI gợi ý ngay, giáo viên chấm và nhận xét; kết quả hiện trong trang của em." },
];

const STATS = [
  { icon: Atom, value: "5", unit: "chủ đề", label: "Kiến thức trọng tâm của chương" },
  { icon: Sigma, value: "14", unit: "mục", label: "Lý thuyết có câu hỏi kiểm tra" },
  { icon: Timer, value: "11", unit: "hoạt động", label: "Học liệu số đã số hoá" },
  { icon: Users, value: "4–6", unit: "HS/nhóm", label: "Làm việc nhóm theo phiếu" },
];

function SectionHeading({ eyebrow, title, sub }: { eyebrow: string; title: string; sub?: string }) {
  return (
    <div className="max-w-2xl mb-12 reveal">
      <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-blue-400 mb-3">{eyebrow}</p>
      <h2 className="text-3xl md:text-5xl font-black tracking-tight leading-tight">{title}</h2>
      {sub && <p className="text-sm md:text-base text-slate-400 mt-4 leading-relaxed">{sub}</p>}
    </div>
  );
}
export default function HomePage() {
  return (
    <main className="min-h-screen bg-slate-950 text-white relative overflow-x-hidden">
      {/* NEN: orb mau + luoi ky thuat + song dien tu */}
      <div className="pointer-events-none absolute inset-0 z-0">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(59,130,246,0.18),transparent_50%)]" />
        <div className="absolute -top-40 -left-32 w-[620px] h-[620px] bg-blue-600/25 rounded-full blur-[150px]" />
        <div className="absolute top-1/3 -right-40 w-[560px] h-[560px] bg-indigo-600/20 rounded-full blur-[150px]" />
        <div className="absolute bottom-0 left-1/4 w-[520px] h-[520px] bg-cyan-500/12 rounded-full blur-[140px]" />
        <div className="physics-grid absolute inset-0 opacity-[0.05]" />
        <div className="physics-lines absolute inset-x-0 top-[20%] h-[400px] opacity-50" />
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
              <span className="block text-[9px] text-blue-400 font-semibold uppercase tracking-widest mt-1">Tương tác · Trực quan · AI</span>
            </div>
          </Link>

          <nav className="hidden md:flex items-center gap-8 text-xs font-semibold text-slate-300">
            <a href="#chu-de" className="hover:text-white transition-colors">Chủ đề</a>
            <a href="#tin-nang" className="hover:text-white transition-colors">Tính năng</a>
            <a href="#quy-trinh" className="hover:text-white transition-colors">Quy trình</a>
            <a href="#thong-ke" className="hover:text-white transition-colors">Thống kê</a>
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
      {/* HERO — 1 cot doc, day dan, thoang mat */}
      <section className="relative z-10 max-w-6xl mx-auto px-5 md:px-8 pt-16 md:pt-24 pb-14 text-center">
        <div className="inline-flex items-center gap-2.5 glass rounded-full px-4 py-2 text-[11px] font-bold uppercase tracking-wider text-blue-300 mb-8 reveal">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-blue-500" />
          </span>
          Hệ thống dạy học Vật lý tương tác
        </div>
        <h1 className="text-5xl md:text-7xl font-black leading-[1.02] tracking-tight reveal">
          <span className="block">Khám phá Vật lý</span>
          <span className="block mt-3 text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-cyan-300 to-indigo-400">
            bằng trải nghiệm
          </span>
        </h1>
        <p className="text-slate-300 text-base md:text-lg leading-relaxed max-w-2xl mx-auto mt-7 reveal reveal-d1">
          Hệ thống dạy học Vật lý thế hệ mới: học qua mô phỏng 3D, trả lời câu hỏi tương tác,
          được AI đồng hành chấm điểm — trực quan, sinh động và hiện đại.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3 mt-9 reveal reveal-d1">
          <Link href="/hoc-sinh" className="shine group inline-flex items-center gap-2.5 px-8 py-4 rounded-2xl bg-gradient-to-r from-blue-500 to-indigo-600 text-white text-sm font-black shadow-xl shadow-blue-600/30 hover:shadow-2xl hover:shadow-blue-500/40 transition-all">
            <GraduationCap className="w-5 h-5" />
            Vào lớp học
            <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
          </Link>
          <Link href="/giao-vien" className="inline-flex items-center gap-2.5 px-8 py-4 rounded-2xl glass text-white text-sm font-bold hover:bg-white/15 transition-all">
            <LayoutDashboard className="w-5 h-5" />
            Cổng giáo viên
          </Link>
        </div>
        <div className="grid grid-cols-3 gap-3 max-w-md mx-auto mt-10 reveal reveal-d2">
          {[
            { value: "5", label: "Chủ đề" },
            { value: "14", label: "Mục lý thuyết" },
            { value: "AI", label: "Trợ lý chấm" },
          ].map((s) => (
            <div key={s.label} className="glass rounded-2xl px-3 py-3">
              <div className="text-2xl font-black text-white">{s.value}</div>
              <div className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold mt-1">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* BAN CHU DE — 4 o ngang */}
      <div className="relative z-10 border-y border-white/10 bg-white/[0.02]">
        <div className="max-w-7xl mx-auto px-5 md:px-8 py-5 grid grid-cols-2 md:grid-cols-4 gap-4">
          {TOPICS.map((t) => {
            const Ico = t.icon;
            return (
              <a key={t.title} href="#chu-de" className="group flex items-center gap-3 glass rounded-2xl px-4 py-3 hover:bg-white/10 hover:-translate-y-0.5 transition-all">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500/20 to-indigo-500/20 border border-blue-400/20 flex items-center justify-center shrink-0">
                  <Ico className="w-4 h-4 text-blue-300" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-slate-100 truncate group-hover:text-white transition-colors">{t.title}</p>
                  <p className="text-[10px] text-slate-500 truncate">{t.desc}</p>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-slate-600 group-hover:text-blue-300 ml-auto shrink-0 transition-all group-hover:translate-x-0.5" />
              </a>
            );
          })}
        </div>
      </div>

      {/* HOA VIET: so do tu dien + mach tich dien — 1 khong duy nhat, day dan */}
      <section id="chu-de" className="relative z-10 max-w-5xl mx-auto px-5 md:px-8 pb-16">
        <div className="flex flex-col lg:flex-row items-center gap-10 reveal reveal-d2">
          <div className="relative w-full lg:w-1/2">
            <div className="absolute -inset-4 rounded-[2rem] bg-gradient-to-tr from-blue-600/25 via-indigo-500/15 to-cyan-400/25 blur-2xl" aria-hidden="true" />
            <div className="glass-strong relative rounded-3xl p-6 shadow-2xl shadow-blue-950/50">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                    <Zap className="w-5 h-5 text-white" />
                  </div>
                  <div className="leading-tight">
                    <p className="text-xs font-black text-white">Tụ điện & điện trường</p>
                    <p className="text-[10px] text-blue-300 font-semibold">Mô phỏng trực quan</p>
                  </div>
                </div>
                <span className="glass rounded-full px-3 py-1 text-[10px] font-bold text-cyan-200">3D</span>
              </div>
              <CapacitorDiagram className="w-full h-auto" />
            </div>
          </div>
          <div className="relative w-full lg:w-1/2">
            <div className="absolute -inset-4 rounded-[2rem] bg-gradient-to-tr from-amber-500/15 to-cyan-400/15 blur-2xl" aria-hidden="true" />
            <div className="glass-strong relative rounded-3xl p-6 shadow-2xl shadow-blue-950/50">
              <div className="flex items-center gap-2.5 mb-4">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
                  <Waves className="w-5 h-5 text-white" />
                </div>
                <div className="leading-tight">
                  <p className="text-xs font-black text-white">Mạch tích điện & phóng điện</p>
                  <p className="text-[10px] text-amber-300 font-semibold">Nối nguồn, ngắt, đèn sáng</p>
                </div>
              </div>
              <CircuitDiagram className="w-full h-auto" />
            </div>
          </div>
        </div>
      </section>

      {/* BAN
...[truncated 5502 chars]
      {/* TINH NANG — 3 cot ngang */}
      <section id="tin-nang" className="relative z-10 border-y border-white/10 bg-white/[0.02]">
        <div className="max-w-7xl mx-auto px-5 md:px-8 py-20">
          <SectionHeading eyebrow="Tính năng nổi bật" title="Một hệ thống, đầy đủ cho lớp học" sub="Mọi thứ học sinh và giáo viên cần được tích hợp trong cùng một nơi — từ lý thuyết đến chấm điểm." />
          <div className="grid md:grid-cols-3 gap-5">
            {FEATURES.map((f) => {
              const Ico = f.icon;
              return (
                <div key={f.title} className="glass rounded-3xl p-6 hover:-translate-y-1 hover:shadow-2xl hover:shadow-blue-950/40 transition-all duration-300 group">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500/20 to-indigo-500/20 border border-blue-400/20 flex items-center justify-center mb-5">
                    <Ico className="w-6 h-6 text-blue-300 group-hover:text-cyan-300 transition-colors" />
                  </div>
                  <h3 className="text-base font-black text-white mb-2">{f.title}</h3>
                  <p className="text-xs text-slate-400 leading-relaxed">{f.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* QUY TRINH — 3 buoc co duong noi */}
      <section id="quy-trinh" className="relative z-10">
        <div className="max-w-7xl mx-auto px-5 md:px-8 py-20">
          <SectionHeading eyebrow="Cách hoạt động" title="Ba bước, rõ ràng" sub="Quy trình đơn giản để giáo viên tổ chức và học sinh thực hiện." />
          <div className="grid md:grid-cols-3 gap-5 relative">
            <div className="hidden md:block absolute top-10 left-[16%] right-[16%] h-px bg-gradient-to-r from-blue-500/40 via-cyan-400/40 to-indigo-500/40" aria-hidden="true" />
            {STEPS.map((s, i) => {
              const Ico = s.icon;
              return (
                <div key={s.title} className="relative glass rounded-3xl p-6 text-center reveal" style={{ transitionDelay: `${i * 80}ms` }}>
                  <div className="relative z-10 w-14 h-14 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center mx-auto mb-5 shadow-lg shadow-blue-600/40">
                    <Ico className="w-6 h-6 text-white" />
                  </div>
                  <span className="inline-block text-[10px] font-bold uppercase tracking-widest text-blue-400 mb-2">Bước {i + 1}</span>
                  <h3 className="text-sm font-black text-white mb-2">{s.title}</h3>
                  <p className="text-xs text-slate-400 leading-relaxed">{s.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* THONG KE — 2x2 co icon */}
      <section id="thong-ke" className="relative z-10 border-y border-white/10 bg-white/[0.02]">
        <div className="max-w-7xl mx-auto px-5 md:px-8 py-20">
          <SectionHeading eyebrow="Tài liệu đã chuẩn bị" title="Đủ học liệu, sẵn sàng dạy" />
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5">
            {STATS.map((s) => {
              const Ico = s.icon;
              return (
                <div key={s.label} className="glass rounded-3xl p-6 hover:-translate-y-1 transition-all duration-300">
                  <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-500/20 to-indigo-500/20 border border-blue-400/20 flex items-center justify-center mb-5">
                    <Ico className="w-5 h-5 text-blue-300" />
                  </div>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-4xl font-black text-white">{s.value}</span>
                    <span className="text-xs font-bold text-blue-400 uppercase tracking-wider">{s.unit}</span>
                  </div>
                  <p className="text-xs text-slate-400 mt-3 leading-relaxed">{s.label}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative z-10">
        <div className="max-w-4xl mx-auto px-5 md:px-8 py-24 text-center">
          <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_center,rgba(59,130,246,0.15),transparent_60%)]" aria-hidden="true" />
          <div className="reveal">
            <h2 className="text-3xl md:text-5xl font-black tracking-tight">Sẵn sàng bước vào lớp học?</h2>
            <p className="text-sm md:text-base text-slate-300 max-w-xl mx-auto mt-5 leading-relaxed">
              Tham gia ngay hôm nay để khám phá Vật lý theo cách mới — tương tác, trực quan và được AI hỗ trợ từng bước.
            </p>
            <div className="flex flex-wrap justify-center gap-3 mt-9">
              <Link href="/hoc-sinh" className="shine inline-flex items-center gap-2 px-7 py-4 rounded-2xl bg-white text-slate-900 text-sm font-black hover:bg-slate-100 shadow-xl transition-all">
                <GraduationCap className="w-4 h-4" /> Vào lớp học
              </Link>
              <Link href="/giao-vien" className="shine inline-flex items-center gap-2 px-7 py-4 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/20 text-sm font-black transition-all">
                <LayoutDashboard className="w-4 h-4" /> Cổng giáo viên
              </Link>
            </div>
          </div>
        </div>
      </section>
      </HomeReveal>

      {/* FOOTER — 4 cot */}
      <footer className="relative z-10 border-t border-white/10 bg-slate-950/80">
        <div className="max-w-7xl mx-auto px-5 md:px-8 py-12">
          <div className="grid md:grid-cols-4 gap-8">
            <div className="space-y-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                  <CapacitorIcon className="w-4 h-4 text-white" />
                </div>
                <div className="leading-none">
                  <span className="font-black text-sm">KHÁM PHÁ VẬT LÝ</span>
                  <span className="block text-[9px] text-blue-400 font-semibold uppercase tracking-widest mt-0.5">Tương tác · Trực quan · AI</span>
                </div>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed">
                Nền tảng khám phá Vật lý theo mô hình lớp học đảo ngược với trợ lý AI và phòng thí nghiệm ảo.
              </p>
              <div className="flex items-center gap-3 pt-1">
                <a href="#" aria-label="Email" className="w-9 h-9 rounded-lg glass flex items-center justify-center hover:bg-white/15 transition-all">
                  <Mail className="w-4 h-4 text-slate-300" />
                </a>
                <a href="#" aria-label="GitHub" className="w-9 h-9 rounded-lg glass flex items-center justify-center hover:bg-white/15 transition-all">
                  <Github className="w-4 h-4 text-slate-300" />
                </a>
              </div>
            </div>
            <div className="space-y-3">
              <h4 className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Hệ thống</h4>
              <ul className="space-y-2.5 text-xs text-slate-500">
                <li><Link href="/hoc-sinh" className="hover:text-white transition-colors">Vào lớp học</Link></li>
                <li><Link href="/giao-vien" className="hover:text-white transition-colors">Cổng giáo viên</Link></li>
                <li><a href="#chu-de" className="hover:text-white transition-colors">Chủ đề học tập</a></li>
                <li><a href="#thong-ke" className="hover:text-white transition-colors">Thống kê lớp</a></li>
              </ul>
            </div>
            <div className="space-y-3">
              <h4 className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Chủ đề</h4>
              <ul className="space-y-2.5 text-xs text-slate-500">
                <li><a href="#chu-de" className="hover:text-white transition-colors">Cấu tạo & nguyên lí</a></li>
                <li><a href="#chu-de" className="hover:text-white transition-colors">Điện dung</a></li>
                <li><a href="#chu-de" className="hover:text-white transition-colors">Năng lượng tụ điện</a></li>
                <li><a href="#chu-de" className="hover:text-white transition-colors">Ứng dụng & củng cố</a></li>
              </ul>
            </div>
            <div className="space-y-3">
              <h4 className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Hỗ trợ</h4>
              <ul className="space-y-2.5 text-xs text-slate-500">
                <li><a href="#quy-trinh" className="hover:text-white transition-colors">Quy trình sử dụng</a></li>
                <li><a href="#tin-nang" className="hover:text-white transition-colors">Tính năng nổi bật</a></li>
                <li><a href="#chu-de" className="hover:text-white transition-colors">Trợ lý AI</a></li>
              </ul>
            </div>
          </div>
          <div className="pt-7 border-t border-white/10 mt-8 flex flex-col md:flex-row items-center justify-between gap-3 text-[11px] text-slate-500">
            <p>© 2026 Khám phá Vật lý — Lớp học đảo ngược</p>
            <p>Tương tác · Trực quan · AI hỗ trợ</p>
          </div>
        </div>
      </footer>
    </main>
  );
}
