"use client";
import { useState, useEffect, Suspense } from "react";
import { supabase } from "@/lib/supabase";
import { CheckCircle2, ArrowLeft, UploadCloud, Link as LinkIcon, FileText } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

function SubmissionForm() {
  const searchParams = useSearchParams();
  const initialAct = searchParams.get('activity');

  const [students, setStudents] = useState<any[]>([]);
  const [activities, setActivities] = useState<any[]>([]);
  const [selectedStudent, setSelectedStudent] = useState("");
  const [selectedActivity, setSelectedActivity] = useState(initialAct || "");
  const [textAnswer, setTextAnswer] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [externalLink, setExternalLink] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    supabase.from('students').select('*').order('full_name').then(({ data }) => { if (data) setStudents(data); });
    supabase.from('activities').select('*').order('id').then(({ data }) => { if (data) setActivities(data); });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    let uploadedUrl = "";
    // Xử lý upload file nếu có
    if (file) {
      const fileName = `submissions/${Date.now()}-${selectedStudent}-${file.name}`;
      const { error: uploadError } = await supabase.storage.from('videos').upload(fileName, file);
      if (!uploadError) {
        const { data } = supabase.storage.from('videos').getPublicUrl(fileName);
        uploadedUrl = data.publicUrl;
      } else {
        alert("Lỗi upload file: " + uploadError.message);
        setLoading(false);
        return;
      }
    }

    // Lưu vào database (Xóa bài cũ nếu nộp lại)
    await supabase.from('submissions').delete().eq('student_name', selectedStudent).eq('activity_id', parseInt(selectedActivity));

    const { error } = await supabase.from('submissions').insert([{ 
      student_name: selectedStudent, 
      activity_id: parseInt(selectedActivity),
      answer: textAnswer,
      file_url: uploadedUrl || externalLink, // Lưu link file hoặc link ngoài
      status: 'pending',
      submitted_at: new Date().toISOString()
    }]);

    if (!error) setSuccess(true);
    else alert("Lỗi nộp bài: " + error.message);
    
    setLoading(false);
  };

  if (success) {
    return (
      <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full text-center space-y-4 animate-slide-up">
        <CheckCircle2 className="w-20 h-20 text-green-500 mx-auto" />
        <h2 className="text-2xl font-bold text-gray-800">Nộp bài thành công!</h2>
        <p className="text-gray-600">Bài làm đã được gửi đến cô giáo. Em có thể nộp lại nếu muốn thay đổi.</p>
        <button onClick={() => { setSuccess(false); setFile(null); setTextAnswer(""); setExternalLink(""); }} className="w-full bg-blue-50 text-blue-700 py-3 rounded-xl font-semibold hover:bg-blue-100 transition-colors">Nộp bài khác</button>
        <Link href="/hoc-sinh" className="block text-sm text-gray-500 hover:text-blue-600">Về trang chủ Học sinh</Link>
      </div>
    );
  }

  return (
    <div className="bg-white p-8 rounded-2xl shadow-xl max-w-2xl w-full space-y-6 relative border border-gray-100">
      <Link href="/hoc-sinh" className="absolute top-6 left-6 text-gray-400 hover:text-blue-600 transition-colors flex items-center gap-1 text-sm font-medium">
        <ArrowLeft className="w-4 h-4" /> Quay lại
      </Link>

      <div className="text-center mt-4">
        <h1 className="text-2xl font-bold text-blue-700">Nộp bài tập</h1>
        <p className="text-gray-500 text-sm mt-1">Hỗ trợ nộp File (PDF, Word, Ảnh, Video) hoặc Link</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-semibold text-gray-700">Tên của em</label>
            <select value={selectedStudent} onChange={(e) => setSelectedStudent(e.target.value)} className="w-full mt-1.5 p-3 border rounded-xl bg-gray-50 focus:ring-2 focus:ring-blue-500 outline-none" required>
              <option value="">-- Chọn tên --</option>
              {students.map(s => <option key={s.id} value={s.full_name}>{s.full_name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-sm font-semibold text-gray-700">Bài tập</label>
            <select value={selectedActivity} onChange={(e) => setSelectedActivity(e.target.value)} className="w-full mt-1.5 p-3 border rounded-xl bg-gray-50 focus:ring-2 focus:ring-blue-500 outline-none" required>
              <option value="">-- Chọn bài --</option>
              {activities.map(a => <option key={a.id} value={a.id}>Bài {a.id}: {a.title}</option>)}
            </select>
          </div>
        </div>

        <div>
          <label className="text-sm font-semibold text-gray-700">Bài làm (Tự luận)</label>
          <textarea value={textAnswer} onChange={(e) => setTextAnswer(e.target.value)} className="w-full mt-1.5 p-3 border rounded-xl h-32 resize-none bg-gray-50 focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Viết bài giải của em ở đây..." />
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          {/* UPLOAD FILE */}
          <div className="border-2 border-dashed border-blue-200 bg-blue-50/50 rounded-xl p-4 text-center hover:bg-blue-50 transition-colors cursor-pointer relative">
            <input type="file" onChange={(e) => setFile(e.target.files?.[0] || null)} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
            <UploadCloud className="w-8 h-8 text-blue-500 mx-auto mb-2" />
            <p className="text-sm font-medium text-blue-700">{file ? file.name : "Tải lên File / Ảnh / Video"}</p>
          </div>
          
          {/* HOẶC ĐIỀN LINK */}
          <div className="border border-gray-200 rounded-xl p-4 flex flex-col justify-center bg-gray-50">
            <label className="text-xs font-semibold text-gray-500 mb-2 flex items-center gap-1"><LinkIcon className="w-3 h-3"/> Hoặc dán Link (Drive, Youtube...)</label>
            <input type="url" value={externalLink} onChange={(e) => setExternalLink(e.target.value)} placeholder="https://..." className="w-full p-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
        </div>

        <button type="submit" disabled={loading} className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 transition-colors shadow-lg shadow-blue-200 disabled:opacity-50">
          {loading ? "Đang gửi bài..." : "Xác nhận Nộp bài"}
        </button>
      </form>
    </div>
  );
}

export default function NopBaiPage() {
  return (
    <main className="min-h-screen p-6 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] bg-gray-50 flex justify-center items-center">
      <Suspense fallback={<div>Đang tải...</div>}>
        <SubmissionForm />
      </Suspense>
    </main>
  );
}