"use client";
import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { Lock, Mail, Loader2 } from "lucide-react";

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

    const { error } = await supabase.auth.signInWithPassword({ 
      email: cleanEmail, 
      password 
    });

    if (error) {
      if (error.message.includes("Email not confirmed")) {
        setError("Tài khoản chưa được xác nhận. Vui lòng kiểm tra email.");
      } else if (error.message.includes("Invalid login credentials")) {
        setError("Sai email hoặc mật khẩu. Vui lòng kiểm tra lại (chú ý viết thường email).");
      } else {
        setError("Lỗi: " + error.message);
      }
      setLoading(false);
    } else {
      // Mở rộng logic nhận diện giáo viên
      if (cleanEmail.includes("cogiao") || cleanEmail.includes("huongxuan") || cleanEmail.includes("giaovien")) {
        router.push("/giao-vien");
      } else {
        router.push("/hoc-sinh");
      }
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center p-4">
      <div className="card max-w-md w-full p-8 space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-blue-700">Đăng nhập</h1>
          <p className="text-gray-500 text-sm mt-1">Hệ thống Học tập Vật lí 11</p>
        </div>

        {error && <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm text-center">{error}</div>}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="text-sm font-medium text-gray-700">Email</label>
            <div className="relative mt-1">
              <Mail className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 z-10" />
              <input 
                type="email" 
                value={email} 
                onChange={(e) => setEmail(e.target.value)} 
                className="input input-icon-left" 
                placeholder="huongxuan@vatly11.com" 
                required 
              />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">Mật khẩu</label>
            <div className="relative mt-1">
              <Lock className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 z-10" />
              <input 
                type="password" 
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
                className="input input-icon-left" 
                placeholder="••••••" 
                required 
              />
            </div>
          </div>
          <button type="submit" disabled={loading} className="btn btn-primary w-full mt-2">
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Đăng nhập"}
          </button>
        </form>
      </div>
    </main>
  );
}