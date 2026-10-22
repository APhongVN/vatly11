"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { Lock, Mail, ArrowLeft, User } from "lucide-react";
import Link from "next/link";

export default function LoginPage() {
  const [role, setRole] = useState<"teacher" | "student">("teacher");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [students, setStudents] = useState<any[]>([]);
  const [selectedStudent, setSelectedStudent] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  useEffect(() => {
    // Tải danh sách sinh viên để hiển thị trong dropdown
    supabase.from('students').select('*').order('full_name').then(({ data }) => {
      if (data) setStudents(data);
    });
  }, []);

  const handleLoginTeacher = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError("");
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim().toLowerCase(), password });
      if (error) setError("Sai email hoặc mật khẩu giáo viên!");
      else if (data.session) window.location.href = "/giao-vien";
    } catch (err: any) { setError("Lỗi kết nối!"); }
    finally { setLoading(false); }
  };

  const handleLoginStudent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudent) return setError("Vui lòng chọn tên của em!");
    const studentData = students.find(s => s.id === selectedStudent);
    if (studentData) {
      localStorage.setItem('student_session', JSON.stringify(studentData));
      window.location.href = "/hoc-sinh";
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center p-4 bg-gray-50">
      <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md relative">
        <Link href="/" className="absolute top-6 left-6 text-gray-400 hover:text-blue-600 flex items-center gap-1 text-sm font-medium"><ArrowLeft className="w-4 h-4"/> Trang chủ</Link>
        
        <h1 className="text-2xl font-bold text-center text-blue-700 mt-4 mb-6">Đăng nhập Hệ thống</h1>
        
        {/* Tabs chuyển đổi Giáo viên / Sinh viên */}
        <div className="flex gap-2 bg-gray-100 p-1 rounded-xl mb-6">
          <button onClick={() => setRole('teacher')} className={`flex-1 py-2 rounded-lg font-medium transition-all ${role === 'teacher' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500'}`}>Giáo viên</button>
          <button onClick={() => setRole('student')} className={`flex-1 py-2 rounded-lg font-medium transition-all ${role === 'student' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500'}`}>Sinh viên</button>
        </div>

        {error && <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-4 text-sm text-center font-medium">{error}</div>}

        {role === 'teacher' ? (
          <form onSubmit={handleLoginTeacher} className="space-y-4 animate-slide-up">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <div className="relative"><Mail className="w-5 h-5 absolute left-3 top-2.5 text-gray-400" /><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full pl-10 pr-4 py-2.5 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" required /></div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Mật khẩu</label>
              <div className="relative"><Lock className="w-5 h-5 absolute left-3 top-2.5 text-gray-400" /><input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full pl-10 pr-4 py-2.5 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" required /></div>
            </div>
            <button type="submit" disabled={loading} className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700">{loading ? "Đang xử lý..." : "Đăng nhập Giáo viên"}</button>
          </form>
        ) : (
          <form onSubmit={handleLoginStudent} className="space-y-4 animate-slide-up">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Chọn tên của em</label>
              <div className="relative">
                <User className="w-5 h-5 absolute left-3 top-3 text-gray-400" />
                <select value={selectedStudent} onChange={(e) => setSelectedStudent(e.target.value)} className="w-full pl-10 pr-4 py-2.5 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none bg-white" required>
                  <option value="">-- Danh sách lớp --</option>
                  {students.map(s => <option key={s.id} value={s.id}>{s.full_name}</option>)}
                </select>
              </div>
            </div>
            <button type="submit" className="w-full bg-emerald-600 text-white py-3 rounded-xl font-bold hover:bg-emerald-700">Vào lớp học</button>
          </form>
        )}
      </div>
    </main>
  );
}