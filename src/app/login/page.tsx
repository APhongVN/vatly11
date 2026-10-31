"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { Lock, Mail, ArrowLeft, Sparkles } from "lucide-react";
import Link from "next/link";

export default function LoginPage() {
  const [role, setRole] = useState<"teacher" | "student">("teacher");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (signInError || !data.user) throw new Error("Email hoặc mật khẩu không đúng.");
      const { data: profile, error: profileError } = await supabase.from("profiles").select("role,full_name").eq("id", data.user.id).maybeSingle();
      if (profileError || !profile || profile.role !== role) {
        await supabase.auth.signOut();
        throw new Error("Tài khoản chưa được cấp quyền cho vai trò này. Hãy liên hệ giáo viên quản lý.");
      }
      if (role === "teacher") {
        localStorage.setItem("teacher_session", JSON.stringify({ id: data.user.id, role, email: data.user.email, name: profile.full_name || data.user.email }));
        router.push("/giao-vien");
        return;
      }
      const { data: student, error: studentError } = await supabase.from("students").select("id,full_name,class_name").eq("auth_user_id", data.user.id).maybeSingle();
      if (studentError || !student) {
        await supabase.auth.signOut();
        throw new Error("Tài khoản chưa được liên kết với danh sách học sinh của lớp.");
      }
      localStorage.setItem("student_session", JSON.stringify(student));
      router.push("/hoc-sinh");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể đăng nhập. Vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-slate-50 via-blue-50/40 to-indigo-50/30">
      <div className="bg-white p-8 md:p-10 rounded-3xl shadow-2xl border border-slate-100 w-full max-w-md relative">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-blue-600 mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Về trang chủ
        </Link>

        <div className="text-center mb-8">
          <div className="w-14 h-14 bg-blue-600 text-white rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-lg shadow-blue-500/30">
            <Sparkles className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-black text-slate-900">Cổng Học Tập Vật Lí 11</h1>
          <p className="text-xs text-slate-500 mt-1">Lớp học đảo ngược - Chuyên đề Tụ điện</p>
        </div>

        {/* Switch Vai trò */}
        <div className="flex gap-1.5 bg-slate-100 p-1.5 rounded-2xl mb-6">
          <button
            type="button"
            onClick={() => setRole('teacher')}
            className={`flex-1 py-2.5 rounded-xl font-bold text-xs transition-all ${
              role === 'teacher' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Giáo viên
          </button>
          <button
            type="button"
            onClick={() => setRole('student')}
            className={`flex-1 py-2.5 rounded-xl font-bold text-xs transition-all ${
              role === 'student' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Học sinh / Sinh viên
          </button>
        </div>

        {error && (
          <div className="bg-rose-50 border border-rose-200 text-rose-700 p-3 rounded-xl mb-5 text-xs font-medium">
            {error}
          </div>
        )}

        {role === 'teacher' ? (
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">Email Giáo viên</label>
              <div className="relative">
                <Mail className="w-5 h-5 absolute left-3.5 top-3 text-slate-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="giaovien@vatly11.edu.vn"
                  className="w-full pl-11 pr-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm bg-slate-50/50"
                  required
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">Mật khẩu</label>
              <div className="relative">
                <Lock className="w-5 h-5 absolute left-3.5 top-3 text-slate-400" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-11 pr-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm bg-slate-50/50"
                  required
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3.5 rounded-xl font-bold text-sm shadow-md shadow-blue-500/25 transition-all mt-2"
            >
              {loading ? "Đang xử lý..." : "Vào Bảng Điều Khiển Giáo Viên"}
            </button>
          </form>
        ) : (
          <form onSubmit={handleLogin} className="space-y-4">
            <p className="text-sm text-slate-600">Đăng nhập bằng tài khoản lớp đã được giáo viên cấp.</p>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">Email học sinh</label>
            <div className="relative"><Mail className="w-5 h-5 absolute left-3.5 top-3 text-slate-400" /><input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="email học sinh" className="w-full pl-11 pr-4 py-3 border border-slate-200 rounded-xl text-sm" required /></div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">Mật khẩu</label>
            <div className="relative"><Lock className="w-5 h-5 absolute left-3.5 top-3 text-slate-400" /><input type="password" value={password} onChange={(event) => setPassword(event.target.value)} className="w-full pl-11 pr-4 py-3 border border-slate-200 rounded-xl text-sm" required /></div>
            <button type="submit" disabled={loading} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-3.5 rounded-xl font-bold text-sm">{loading ? "Đang xác thực..." : "Đăng nhập học sinh"}</button>
          </form>
        )}
      </div>
    </main>
  );
}
