import Link from "next/link";
import { Compass, Home, ArrowLeft } from "lucide-react";

export default function NotFound() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 p-6 text-white">
      <div className="w-full max-w-lg text-center space-y-6">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-blue-600 shadow-lg shadow-blue-500/30">
          <Compass className="h-10 w-10" />
        </div>
        <div className="space-y-2">
          <p className="text-6xl font-black tracking-tight">404</p>
          <h1 className="text-xl font-bold">Không tìm thấy trang</h1>
          <p className="text-sm text-slate-300 leading-relaxed">
            Đường dẫn em mở không tồn tại hoặc đã được chuyển đi. Hãy quay lại trang chủ hoặc mở lại lớp học.
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Link href="/" className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-blue-700">
            <Home className="h-4 w-4" /> Về trang chủ
          </Link>
          <Link href="/hoc-sinh" className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-white/20">
            <ArrowLeft className="h-4 w-4" /> Vào lớp học
          </Link>
        </div>
      </div>
    </main>
  );
}
