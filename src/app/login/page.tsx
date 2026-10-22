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

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setError("Sai email hoặc mật khẩu!");
      setLoading(false);
    } else {
      // Nếu email là cogiao -> vào trang giáo viên, ngược lại vào trang học sinh
      if (email.includes("cogiao")) {
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
              <Mail className="w-5 h-5 absolute left-3 top-3 text-gray-400" />
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="input pl-10" placeholder="cogiao@vatly11.com" required />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">Mật khẩu</label>
            <div className="relative mt-1">
              <Lock className="w-5 h-5 absolute left-3 top-3 text-gray-400" />
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="input pl-10" placeholder="••••••" required />
            </div>
          </div>
          <button type="submit" disabled={loading} className="btn btn-primary w-full">
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Đăng nhập"}
          </button>
        </form>
      </div>
    </main>
  );
}