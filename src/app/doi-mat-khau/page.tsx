"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { LockKeyhole, LoaderCircle, ShieldCheck } from "lucide-react";
import { supabase } from "@/lib/supabase";

export default function ChangeTemporaryPasswordPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    const verifyAccount = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!active) return;
      if (!user) { router.replace("/login"); return; }
      const { data: profile, error: profileError } = await supabase.from("profiles")
        .select("role,must_change_password").eq("id", user.id).maybeSingle();
      if (!active) return;
      if (profileError || profile?.role !== "student") { router.replace("/login?error=role"); return; }
      if (!profile.must_change_password) { router.replace("/hoc-sinh"); return; }
      setReady(true);
    };
    void verifyAccount();
    return () => { active = false; };
  }, [router]);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    if (password.length < 12 || password.length > 128) { setError("Mật khẩu mới cần dài từ 12 đến 128 ký tự."); return; }
    if (password !== confirmation) { setError("Hai mật khẩu chưa khớp nhau."); return; }
    setSaving(true);
    try {
      const response = await fetch("/api/account/update-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Không đổi được mật khẩu.");
      router.replace("/hoc-sinh");
      router.refresh();
    } catch (changeError) {
      setError(changeError instanceof Error ? changeError.message : "Không đổi được mật khẩu. Hãy thử lại.");
    } finally {
      setSaving(false);
    }
  };

  if (!ready) return <main className="grid min-h-screen place-items-center bg-slate-50"><LoaderCircle className="h-8 w-8 animate-spin text-blue-700" aria-label="Đang kiểm tra tài khoản" /></main>;

  return <main className="grid min-h-screen place-items-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-4">
    <section className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-7 shadow-xl sm:p-9">
      <div className="mb-6 grid h-12 w-12 place-items-center rounded-2xl bg-blue-700 text-white"><ShieldCheck className="h-6 w-6" /></div>
      <h1 className="text-2xl font-black text-slate-900">Đổi mật khẩu lần đầu</h1>
      <p className="mt-2 text-sm leading-6 text-slate-600">Giáo viên đã cấp mật khẩu tạm. Hãy đặt mật khẩu riêng dài ít nhất 12 ký tự trước khi vào lớp.</p>
      {error && <p role="alert" className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{error}</p>}
      <form onSubmit={submit} className="mt-6 space-y-4">
        <label className="block text-sm font-semibold text-slate-700">Mật khẩu mới
          <span className="relative mt-1 block"><LockKeyhole className="absolute left-3 top-3 h-4 w-4 text-slate-400" /><input type="password" autoComplete="new-password" minLength={12} maxLength={128} required value={password} onChange={(event) => setPassword(event.target.value)} className="w-full rounded-xl border border-slate-300 py-2.5 pl-10 pr-3 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100" /></span>
        </label>
        <label className="block text-sm font-semibold text-slate-700">Nhập lại mật khẩu mới
          <input type="password" autoComplete="new-password" minLength={12} maxLength={128} required value={confirmation} onChange={(event) => setConfirmation(event.target.value)} className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100" />
        </label>
        <button type="submit" disabled={saving} className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-700 px-4 py-3 font-bold text-white hover:bg-blue-800 disabled:opacity-60">{saving && <LoaderCircle className="h-4 w-4 animate-spin" />}{saving ? "Đang cập nhật…" : "Lưu mật khẩu và vào lớp"}</button>
      </form>
    </section>
  </main>;
}
