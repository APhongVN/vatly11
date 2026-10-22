"use client";
import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { Lock, Mail, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    const cleanEmail = email.trim().toLowerCase();

    try {
      // 1. Thử đăng nhập Giáo viên (Supabase Auth)
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({ email: cleanEmail, password });
      
      if (!authError && authData.session) {
        window.location.href = "/giao-vien";
        return;
      }

      // 2. Thử đăng nhập Sinh viên (Bảng students)
      const { data: studentData } = await supabase.from('students').select('*').eq('email', cleanEmail).eq('password', password).single();
      
      if (studentData) {
        localStorage.setItem('student_session', JSON.stringify(studentData));
        window.location.href = "/hoc-sinh";
      } else {
        setError("Sai email hoặc mật khẩu!");
      }
    } catch (err: any) {
      setError("Lỗi kết nối: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center p-4 bg-gray-50">
      <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md relative">
        <Link href="/" className="absolute top-6 left-6 text-gray-400 hover:text-blue-600 flex items-center gap-1 text-sm font-medium"><ArrowLeft className="w-4 h-4"/> Trang chủ</Link>
        <h1 className="text-2xl font-bold text-center text-blue-700 mt-4 mb-6">Đăng nhập Hệ thống</h1>
        {error && <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-4 text-sm text-center font-medium">{error}</div>}
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <div className="relative">
              <Mail className="w-5 h-5 absolute left-3 top-2.5 text-gray-400" />
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full pl-10 pr-4 py-2.5 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" required />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Mật khẩu</label>
            <div className="relative">
              <Lock className="w-5 h-5 absolute left-3 top-2.5 text-gray-400" />
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full pl-10 pr-4 py-2.5 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" required />
            </div>
          </div>
          <button type="submit" disabled={loading} className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700">
            {loading ? "Đang xử lý..." : "Đăng nhập"}
          </button>
        </form>
      </div>
    </main>
  );
}