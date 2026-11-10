"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { Lock, Mail, ArrowLeft, Sparkles, Users } from "lucide-react";
import Link from "next/link";

type ClassStudent = { id: string; name: string; code?: string };
type ClassGroup = { name: string; students: ClassStudent[] };

const REMEMBER_KEY = "vatly11_last_login_choice";

export default function LoginPage() {
  const [role, setRole] = useState<"teacher" | "student">("teacher");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState("");
  const [classes, setClasses] = useState<ClassGroup[]>([]);
  const [selectedClass, setSelectedClass] = useState("");
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [classesLoading, setClassesLoading] = useState(false);
  const router = useRouter();

  // Mục 11: tải danh sách lớp + học sinh để chọn tên thay vì gõ tên đăng nhập.
  useEffect(() => {
    let cancelled = false;
    const remembered = (() => {
      try { return JSON.parse(localStorage.getItem(REMEMBER_KEY) || "{}") as { role?: string; className?: string; studentId?: string }; } catch { return {}; }
    })();
    if (remembered.role === "student") {
      setSelectedClass(remembered.className || "");
      setSelectedStudentId(remembered.studentId || "");
    }
    if (role !== "student" || classes.length) return;
    setClassesLoading(true);
    fetch("/api/public-classes", { cache: "no-store" })
      .then((response) => response.json())
      .then((data) => { if (!cancelled) setClasses(Array.isArray(data.classes) ? data.classes : []); })
      .catch(() => { if (!cancelled) setClasses([]); })
      .finally(() => { if (!cancelled) setClassesLoading(false); });
    return () => { cancelled = true; };
     
  }, [role, classes.length]);

  const studentsOfClass = classes.find((group) => group.name === selectedClass)?.students ?? [];
  const selectedStudent = studentsOfClass.find((student) => student.id === selectedStudentId) ?? null;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      if (role === "student") {
        if (!selectedClass) throw new Error("Em hãy chọn lớp của mình trước khi đăng nhập.");
        if (!selectedStudentId) throw new Error("Em hãy chọn tên của mình trong danh sách lớp.");
        const response = await fetch("/api/auth/student-login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ studentId: selectedStudentId, password, className: selectedClass }),
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "Tên hoặc mật khẩu không đúng.");
        localStorage.setItem("student_session", JSON.stringify(result.student));
        localStorage.setItem(REMEMBER_KEY, JSON.stringify({ role: "student", className: selectedClass, studentId: selectedStudentId }));
        if (result.mustChangePassword) {
          router.push("/doi-mat-khau");
          return;
        }
        router.push("/hoc-sinh");
        return;
      }
      const { data, error: signInError } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (signInError || !data.user) throw new Error("Email hoặc mật khẩu không đúng.");
      const { data: profile, error: profileError } = await supabase.from("profiles")
        .select("role,full_name").eq("id", data.user.id).maybeSingle();
      if (profileError || !profile || profile.role !== "teacher") {
        await supabase.auth.signOut();
        throw new Error("Tài khoản chưa được cấp quyền giáo viên.");
      }
      // Bắt buộc có session thật trước khi chuyển trang (tránh chuyển trang khi cookie chưa ghi).
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData?.session) throw new Error("Phiên đăng nhập chưa sẵn sàng. Vui lòng thử lại.");
      setVerifying(true);
      await new Promise((resolve) => setTimeout(resolve, 900));
      router.push("/giao-vien");
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
                  placeholder="giaovien@vatly.com"
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
              disabled={loading || verifying}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white py-3.5 rounded-xl font-bold text-sm shadow-md shadow-blue-500/25 transition-all mt-2"
            >
              {verifying ? "Đang xác thực quyền giáo viên..." : loading ? "Đang xử lý..." : "Vào Bảng Điều Khiển Giáo Viên"}
            </button>
            {verifying && (
              <div role="status" className="mt-3 flex items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-3 py-2.5 text-xs font-semibold text-blue-800">
                <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-blue-300 border-t-blue-700" />
                Đã đăng nhập thành công — hệ thống đang kiểm tra quyền giáo viên và chuyển bạn vào lớp.
              </div>
            )}
          </form>
        ) : (
          <form onSubmit={handleLogin} className="space-y-4">
            <p className="text-sm text-slate-600">Chọn lớp, chọn tên của em rồi nhập mật khẩu được cô cấp. Không cần gõ tên đăng nhập.</p>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">Lớp của em</label>
              <div className="relative"><Sparkles className="w-5 h-5 absolute left-3.5 top-3 text-slate-400" />
                <select value={selectedClass} onChange={(event) => { setSelectedClass(event.target.value); setSelectedStudentId(""); }} disabled={classesLoading} className="w-full pl-11 pr-4 py-3 border border-slate-200 rounded-xl text-sm bg-white" required>
                  <option value="">{classesLoading ? "Đang tải danh sách lớp…" : "— Chọn lớp —"}</option>
                  {classes.map((group) => <option key={group.name} value={group.name}>{group.name} ({group.students.length} bạn)</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">Tên của em</label>
              <div className="relative"><Users className="w-5 h-5 absolute left-3.5 top-3 text-slate-400" />
                <select value={selectedStudentId} onChange={(event) => setSelectedStudentId(event.target.value)} disabled={classesLoading || !selectedClass} className="w-full pl-11 pr-4 py-3 border border-slate-200 rounded-xl text-sm bg-white disabled:bg-slate-100 disabled:text-slate-400" required>
                  <option value="">{!selectedClass ? "— Chọn lớp trước —" : studentsOfClass.length === 0 ? "Lớp này chưa có danh sách" : "— Chọn tên —"}</option>
                  {studentsOfClass.map((student) => <option key={student.id} value={student.id}>{student.code ? `${student.code} — ${student.name}` : student.name}</option>)}
                </select>
              </div>
              {selectedStudent && <p className="mt-1.5 text-[11px] text-slate-500">Đang chọn: <strong className="text-slate-700">{selectedStudent.name}</strong> · Lớp {selectedClass}</p>}
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">Mật khẩu</label>
              <div className="relative"><Lock className="w-5 h-5 absolute left-3.5 top-3 text-slate-400" /><input type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="••••••••" className="w-full pl-11 pr-4 py-3 border border-slate-200 rounded-xl text-sm" required /></div>
            </div>
            <button type="submit" disabled={loading} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-3.5 rounded-xl font-bold text-sm">{loading ? "Đang xác thực..." : "Đăng nhập học sinh"}</button>
            <p className="text-[11px] text-slate-400 text-center">Lần đăng nhập sau, lớp và tên của em sẽ được chọn sẵn.</p>
          </form>
        )}
      </div>
    </main>
  );
}
