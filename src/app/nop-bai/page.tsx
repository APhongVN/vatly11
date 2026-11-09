"use client";

export const dynamic = "force-dynamic";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import Image from "next/image";
import { supabase } from "@/lib/supabase";

import { normalizeSubmissionFileUrl } from "@/lib/submission-validation";
import {
  CheckCircle2, ArrowLeft, UploadCloud, FileText, Microscope,
  Loader2, AlertCircle, Edit3, Send, User,
  RefreshCw, Check, BookOpen, ExternalLink, HelpCircle
} from "lucide-react";
import { useSearchParams } from "next/navigation";

function NopBaiContent() {
  const searchParams = useSearchParams();
  const initialAct = searchParams.get("activity");

  const [activities, setActivities] = useState<any[]>([]);
  const [selectedStudent, setSelectedStudent] = useState("");
  const [studentId, setStudentId] = useState("");
  const [selectedActivity, setSelectedActivity] = useState(initialAct || "");
  const [textAnswer, setTextAnswer] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [externalLink, setExternalLink] = useState("");
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [showText, setShowText] = useState(true);

  useEffect(() => {
    supabase.from("activities").select("*").order("id").then(({ data }) => {
      if (data) {
        setActivities(data);
        if (!initialAct && data.length > 0) {
          setSelectedActivity(String(data[0].id));
        }
      }
    });

    // Tự động điền nếu đã có session học sinh
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return;
      const { data: student } = await supabase.from("students").select("id,full_name").eq("auth_user_id", user.id).maybeSingle();
      if (student) { setSelectedStudent(student.full_name); setStudentId(student.id); }
    });
  }, [initialAct]);

  const currentActivityData = activities.find(a => String(a.id) === String(selectedActivity));

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] || null;
    setFile(f);
    if (f) {
      const url = URL.createObjectURL(f);
      setFilePreview(url);
    } else {
      setFilePreview(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const finalStudentName = selectedStudent.trim();

    if (!studentId || !finalStudentName) {
      alert("Vui lòng đăng nhập bằng tài khoản học sinh đã được liên kết với danh sách lớp.");
      setLoading(false);
      return;
    }
    if (!currentActivityData || currentActivityData.status !== "available" || currentActivityData.accepting_submissions === false || (currentActivityData.deadline && new Date(currentActivityData.deadline).getTime() < Date.now())) {
      alert("Hoạt động chưa mở nhận bài hoặc đã quá hạn.");
      setLoading(false);
      return;
    }

    if (!textAnswer.trim() && !file && !externalLink) {
      alert("Vui lòng nhập nội dung bài giải hoặc tải tệp/liên kết trước khi nộp.");
      setLoading(false);
      return;
    }

    // Upload file nếu có
    let uploadedUrl = "";
    if (file) {
      try {
        if (file.size > 25 * 1024 * 1024) throw new Error("Tệp nộp bài tối đa 25 MB.");
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("Phiên đăng nhập hết hạn. Em hãy đăng nhập lại.");
        const cleanName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
        const fileName = `submissions/${user.id}/${Date.now()}-${cleanName}`;
        const { error: uploadError } = await supabase.storage.from("class-work").upload(fileName, file, { contentType: file.type || "application/octet-stream" });
        if (!uploadError) {
          uploadedUrl = fileName;
        } else {
          throw uploadError;
        }
      } catch (upErr) {
        alert(upErr instanceof Error ? upErr.message : "Không tải được tệp bài làm lên hệ thống.");
        setLoading(false);
        return;
      }
    }

    const finalFileUrl = uploadedUrl || externalLink.trim();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || (finalFileUrl && !normalizeSubmissionFileUrl(finalFileUrl, user.id))) {
      if (uploadedUrl) await supabase.storage.from("class-work").remove([uploadedUrl]);
      alert("Liên kết/tệp nộp bài không hợp lệ. Chỉ nhận đường dẫn tệp của em hoặc link http(s).");
      setLoading(false);
      return;
    }

    const response = await fetch("/api/submissions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ activityId: parseInt(selectedActivity), answer: textAnswer, fileUrl: finalFileUrl }),
    });
    const result = await response.json();
    if (response.ok) {
      setSuccess(true);
    } else {
      if (uploadedUrl) await supabase.storage.from("class-work").remove([uploadedUrl]);
      alert("Lỗi nộp bài: " + (result.error || "Không thể lưu bài làm."));
    }
    setLoading(false);
  };

  if (success) {
    return (
      <main className="min-h-screen p-4 md:p-8 bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/20 flex justify-center items-center">
        <div className="bg-white p-8 rounded-3xl shadow-xl border border-emerald-100 max-w-lg w-full text-center space-y-6 animate-in fade-in">
          <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
            <CheckCircle2 className="w-12 h-12" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-slate-800">Nộp bài thành công!</h2>
            <p className="text-slate-500 text-sm mt-1">Bài làm của em đã được ghi nhận trên hệ thống và gửi đến giáo viên. Giáo viên sẽ chấm và phản hồi sớm.</p>
          </div>

          <div className="pt-2 flex flex-col gap-3">
            <button
              onClick={() => {
                setSuccess(false);
                setTextAnswer("");
                setFile(null);
                setFilePreview(null);
                setExternalLink("");
              }}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-xl shadow-md transition-all flex items-center justify-center gap-2"
            >
              <RefreshCw className="w-4 h-4" /> Nộp bài tiếp theo
            </button>
            <Link
              href="/hoc-sinh"
              className="text-sm font-medium text-slate-600 hover:text-blue-600 py-2"
            >
              ← Quay về Bảng điều khiển Học sinh
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen p-4 md:p-8 bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/20 flex justify-center items-center">
      <div className="bg-white p-6 md:p-10 rounded-3xl shadow-xl border border-slate-100 max-w-3xl w-full space-y-8">

        {/* Header navigation */}
        <div className="flex items-center justify-between border-b pb-5">
          <Link href="/hoc-sinh" className="inline-flex items-center gap-2 text-slate-500 hover:text-blue-600 font-medium text-sm transition-colors">
            <ArrowLeft className="w-4 h-4" /> Quay lại lớp học
          </Link>
          <div className="flex items-center gap-2 px-3 py-1 bg-emerald-50 text-emerald-700 rounded-full text-xs font-semibold border border-emerald-100">
            <CheckCircle2 className="w-3.5 h-3.5" /> Bài nộp sẽ được giáo viên chấm
          </div>
        </div>

        <div>
          <h1 className="text-3xl font-extrabold text-slate-900">Nộp bài tập Tụ điện</h1>
          <p className="text-slate-500 text-sm mt-1">
            Học sinh có thể viết bài trực tiếp, quét ảnh bài làm bằng AI OCR hoặc tải tệp đính kèm.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Thông tin học sinh & bài học */}
          <div className="grid md:grid-cols-2 gap-5">
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5"><User className="w-4 h-4 text-blue-600" /> Học sinh đang đăng nhập</label>
              <div className="w-full p-3 rounded-xl border border-emerald-200 bg-emerald-50 text-sm font-semibold text-emerald-900">{selectedStudent || "Đang xác minh tài khoản…"}</div>
            </div>

            {/* Chọn bài học */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <BookOpen className="w-4 h-4 text-blue-600" /> Bài tập cần nộp
              </label>
              <select
                value={selectedActivity}
                onChange={(e) => setSelectedActivity(e.target.value)}
                className="w-full p-3 rounded-xl border border-slate-200 bg-slate-50/50 focus:ring-2 focus:ring-blue-500 outline-none text-sm font-medium"
                required
              >
                {activities.map((act) => (
                  <option key={act.id} value={act.id}>
                    Bài {act.id}: {act.title}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Mô tả / Gợi ý bài học nếu có */}
          {currentActivityData && (
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 text-xs text-slate-600 space-y-1">
              <p className="font-semibold text-slate-800">Yêu cầu bài {currentActivityData.id}: {currentActivityData.title}</p>
              {currentActivityData.description && <p>{currentActivityData.description}</p>}

            </div>
          )}

          {/* Tab chọn hình thức */}
          <div className="grid grid-cols-2 p-1.5 bg-slate-100 rounded-2xl">
            <button
              type="button"
              onClick={() => setShowText(true)}
              className={`py-2.5 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 ${
                showText ? "bg-white text-blue-600 shadow-sm" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Microscope className="w-4 h-4" /> Soạn thảo / Quét ảnh
            </button>
            <button
              type="button"
              onClick={() => setShowText(false)}
              className={`py-2.5 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 ${
                !showText ? "bg-white text-blue-600 shadow-sm" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <UploadCloud className="w-4 h-4" /> Đính kèm tệp / Link ngoài
            </button>
          </div>

          {/* Khu vực soạn thảo */}
          {showText ? (
            <div className="space-y-4">
              {/* Chọn ảnh bài làm (xem trước, giáo viên sẽ chấm) */}
              <div className="p-4 rounded-2xl bg-blue-50/60 border border-blue-100">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div className="text-xs text-blue-900">
                    <p className="font-bold">Em có thể chụp ảnh bài làm để đính kèm (giáo viên sẽ chấm trên web).</p>
                    <p className="text-blue-700 mt-0.5">hoặc soạn nội dung trực tiếp bên dưới.</p>
                  </div>
                  <div>
                    <input id="submission-image-input" type="file" accept="image/*" onChange={handleFileChange} className="sr-only" />
                    <button type="button" onClick={() => document.getElementById("submission-image-input")?.click()} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all flex items-center gap-2 cursor-pointer w-full justify-center"
                    >
                      <UploadCloud className="w-4 h-4" /> {file ? "Đổi ảnh khác" : "Chọn ảnh bài làm"}
                    </button>
                  </div>
                </div>

              {/* Nếu đã chọn ảnh */}
              {file && (
                <div className="p-4 bg-slate-50 border rounded-2xl flex flex-col md:flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    {filePreview && (
                      <Image unoptimized src={filePreview} width={64} height={64} alt="Xem trước" className="w-16 h-16 object-cover rounded-xl border shadow-sm" />
                    )}
                    <div>
                      <p className="text-xs font-bold text-slate-800">{file.name}</p>
                      <p className="text-[11px] text-slate-500">{(file.size / 1024).toFixed(1)} KB</p>
                    </div>
                  </div>
                  <div className="flex gap-2 w-full md:w-auto">
                    <button
                      type="button"
                      onClick={() => { setFile(null); setFilePreview(null); }}
                      className="px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-xl"
                    >
                      Bỏ ảnh
                    </button>
                  </div>
                </div>
              )}
              </div>

              {/* Trình soạn thảo */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                  Nội dung bài làm (hoặc kết quả trích xuất):
                </label>
                <textarea
                  value={textAnswer}
                  onChange={(e) => setTextAnswer(e.target.value)}
                  placeholder="Nhập các bước giải, hiện tượng, công thức và đáp số tại đây... (Ví dụ: Ta có C = Q/U = ...)"
                  className="w-full min-h-[220px] p-4 rounded-2xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none text-sm text-slate-800 leading-relaxed font-sans"
                />
              </div>

              {/* Nút xóa nội dung */}
              <div className="flex items-center gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setTextAnswer("")}
                  className="px-3 py-2 text-xs font-medium text-slate-500 hover:text-slate-800"
                >
                  Xóa nội dung
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-5">
              {/* Upload file đính kèm */}
              <div className="border-2 border-dashed border-slate-200 hover:border-blue-400 bg-slate-50/50 rounded-2xl p-6 text-center transition-all cursor-pointer relative">
                <input
                  type="file"
                  onChange={handleFileChange}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <UploadCloud className="w-10 h-10 text-slate-400 mx-auto mb-2" />
                <p className="text-sm font-semibold text-slate-700">
                  {file ? file.name : "Kéo thả hoặc bấm để chọn tệp bài làm"}
                </p>
                <p className="text-xs text-slate-400 mt-1">Hỗ trợ PDF, DOCX, Ảnh bài làm, Video thí nghiệm</p>
              </div>

              {/* Link liên kết ngoài */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <ExternalLink className="w-4 h-4 text-blue-600" /> Hoặc đính kèm Link (Google Drive / Canva / YouTube)
                </label>
                <input
                  type="url"
                  value={externalLink}
                  onChange={(e) => setExternalLink(e.target.value)}
                  placeholder="https://drive.google.com/..."
                  className="w-full p-3 rounded-xl border border-slate-200 bg-slate-50/50 focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                />
              </div>
            </div>
          )}

          {/* Nút gửi chính */}
          <div className="pt-4 border-t">
            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-2xl font-bold text-base shadow-lg shadow-blue-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
              {loading ? "Đang gửi bài và xử lý..." : "Xác nhận nộp bài"}
            </button>
            <p className="text-center text-xs text-slate-400 mt-2">
              Giáo viên sẽ nhận được bài nộp tức thì kèm kết quả phân tích của AI.
            </p>
          </div>
        </form>
      </div>
    </main>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-slate-500">Đang tải trang nộp bài...</div>}>
      <NopBaiContent />
    </Suspense>
  );
}
