"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { Lock, Mail, Loader2, AlertTriangle } from "lucide-react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [envError, setEnvError] = useState(false);
  const router = useRouter();

  useEffect(() => {
    // Kiểm tra xem biến môi trường có bị lỗi không
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (!url || url.includes("placeholder")) {
      setEnvError(true);
    }
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    const cleanEmail = email.trim().toLowerCase();

    try {
      const { error } = await supabase.auth.signInWithPassword({ email: cleanEmail, password });
      if (error) {
        if (error.message === "Failed to fetch") {
          setError("Lỗi kết nối Database (Hãy kiểm tra lại biến môi trường trên Render).");
        } else if (error.message.includes("Invalid login credentials")) {
          setError("Sai email hoặc mật khẩu.");
        } else {
          setError("Lỗi: " + error.message);
        }
        setLoading(false);
      } else {
        if (cleanEmail.includes("huongxuan") || cleanEmail.includes("cogiao")) {
          router.push("/giao-vien");
        } else {
          router.push("/hoc-sinh");
        }
      }
    } catch (err: any) {
      setError("Lỗi hệ thống: " + err.message);
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center p-4">
      <div className="card max-w-md w-full p-8 space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-blue-700">Đăng nhập</h1>
          <p className="text-gray-500 text-sm mt-1">Hệ thống Học tập Vật lí 11</p>
        </div>

        {envError && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg text-sm flex items-start gap-2">
            <AlertTriangle className="w-5 h-5 shrink-0" />
            <p><strong>LỖI CẤU HÌNH:</strong> Render chưa nhận được link Supabase. Hãy vào Render thêm biến môi trường và bấm <strong>Clear build cache & deploy</strong>.</p>
          </div>
        )}

        {error && <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm text-center">{error}</div>}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="text-sm font-medium text-gray-700">Email</label>
            <div className="relative mt-1">
              <Mail className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 z-10" />
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="input input-icon-left" placeholder="huongxuan@vatly11.com" required />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">Mật khẩu</label>
            <div className="relative mt-1">
              <Lock className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 z-10" />
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="input input-icon-left" placeholder="••••••" required />
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