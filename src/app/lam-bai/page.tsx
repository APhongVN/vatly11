"use client";
import { useState, useEffect, useCallback, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Clock, Trophy, Loader2 } from "lucide-react";
import Link from "next/link";
import Image from "next/image";

function QuizContent() {
  const searchParams = useSearchParams();
  const quizId = searchParams.get('quiz');
  const router = useRouter();

  const [quiz, setQuiz] = useState<any>(null);
  const [questions, setQuestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeLeft, setTimeLeft] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [loadError, setLoadError] = useState("");

  const handleSubmit = useCallback(async (autoSubmit = false) => {
    if (submitting || submitted || !quizId) return;
    if (!autoSubmit && !confirm("Em có chắc chắn muốn nộp bài?")) return;
    setSubmitting(true);
    try {
      const response = await fetch("/api/quiz-submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quizId: Number(quizId), answers }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Không nộp được bài.");
      setScore(Number(result.score) || 0);
      setSubmitted(true);
    } catch (error) {
      alert(error instanceof Error ? error.message : "Không nộp được bài.");
    } finally {
      setSubmitting(false);
    }
  }, [answers, quizId, submitted, submitting]);
  useEffect(() => {
    let cancelled = false;
    const fetchQuiz = async () => {
      if (!quizId || !/^\d+$/.test(quizId)) {
        setLoadError("Mã bài trắc nghiệm không hợp lệ.");
        setLoading(false);
        return;
      }
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/login'); return; }
      const { data: enrolledStudent } = await supabase.from("students")
        .select("id,full_name,class_name").eq("auth_user_id", user.id).maybeSingle();
      if (!enrolledStudent) {
        setLoadError("Tài khoản chưa được gắn với hồ sơ học sinh. Hãy báo giáo viên cập nhật danh sách lớp.");
        setLoading(false);
        return;
      }
      const [{ data: qz }, { data: qs }] = await Promise.all([
        supabase.from('quizzes').select('id,title,time_limit').eq('id', Number(quizId)).maybeSingle(),
        supabase.from('quiz_questions').select('id,quiz_id,question,image_url,options').eq('quiz_id', Number(quizId)).order('id'),
      ]);
      if (cancelled) return;
      if (qz && qs?.length) {
        setQuiz(qz);
        setQuestions(qs);
        setTimeLeft(qz.time_limit * 60);
      } else {
        setLoadError("Không tìm thấy bài trắc nghiệm hoặc bài chưa có câu hỏi.");
      }
      setLoading(false);
    };
    void fetchQuiz();
    return () => { cancelled = true; };
  }, [quizId, router]);
  useEffect(() => {
    if (loading || submitted || timeLeft <= 0) return;
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) { clearInterval(timer); handleSubmit(true); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [loading, submitted, timeLeft, handleSubmit]);

  const handleSelect = (qId: string, optIndex: number) => { if (!submitted) setAnswers({ ...answers, [qId]: optIndex }); };

  const formatTime = (seconds: number) => `${Math.floor(seconds / 60)}:${(seconds % 60) < 10 ? '0' : ''}${seconds % 60}`;

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-10 h-10 animate-spin text-blue-600"/></div>;
  if (!quiz) return <div className="min-h-screen text-center p-10 font-bold">{loadError || "Không tìm thấy bài trắc nghiệm."}</div>;

  return (
    <main className="min-h-screen bg-gray-50 pb-20">
      <header className="bg-white shadow-sm sticky top-0 z-10 border-b">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <h1 className="font-bold text-lg text-gray-800 truncate pr-4">{quiz.title}</h1>
          {!submitted ? <div className={`flex items-center gap-2 font-mono text-xl font-bold px-4 py-1.5 rounded-lg ${timeLeft < 60 ? 'bg-red-100 text-red-600 animate-pulse' : 'bg-blue-50 text-blue-700'}`}><Clock className="w-5 h-5" /> {formatTime(timeLeft)}</div> : <span className="font-bold text-green-600">Đã nộp bài</span>}
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 mt-8 space-y-6">
        {submitted && (
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-8 text-white text-center shadow-xl">
            <Trophy className="w-16 h-16 mx-auto mb-4 text-yellow-300" />
            <h2 className="text-3xl font-bold mb-2">Kết quả của em</h2>
            <div className="text-5xl font-extrabold mb-4">{score.toFixed(1)} <span className="text-2xl font-normal opacity-80">/ 10</span></div>
            <Link href="/hoc-sinh" className="inline-block mt-6 bg-white text-blue-700 px-6 py-2 rounded-xl font-bold hover:bg-gray-100">Quay lại trang chủ</Link>
          </div>
        )}

        <div className="space-y-6">
          {questions.map((q, idx) => (
            <div key={q.id} className="bg-white rounded-2xl shadow-sm border p-6">
              <h3 className="font-bold text-lg mb-4"><span className="text-blue-600 mr-2">Câu {idx + 1}:</span> {q.question}</h3>
              {q.image_url && <Image unoptimized src={q.image_url} width={800} height={600} alt="Hình ảnh câu hỏi" className="max-h-64 rounded-lg mb-4 object-contain border" />}

              <div className="grid md:grid-cols-2 gap-3 mb-4">
                {q.options.map((opt: string, optIdx: number) => {
                  const isSelected = answers[q.id] === optIdx;
                  let btnClass = "border-gray-200 hover:border-blue-400 hover:bg-blue-50";
                  if (isSelected && !submitted) btnClass = "border-blue-600 bg-blue-50 ring-1 ring-blue-600";
                  if (submitted) {
                    btnClass = isSelected ? "border-blue-500 bg-blue-50" : "border-gray-200 opacity-70";
                  }
                  return (
                    <button key={optIdx} onClick={() => handleSelect(q.id, optIdx)} disabled={submitted || submitting} className={`text-left p-4 rounded-xl border-2 transition-all flex items-center justify-between ${btnClass}`}>
                      <span className="font-medium"><span className="inline-block w-6 h-6 rounded-full bg-white border text-center leading-5 text-sm mr-2">{String.fromCharCode(65 + optIdx)}</span>{opt}</span>
                    </button>
                  );
                })}
              </div>

              {submitted && <p className="mt-3 text-xs text-slate-500">Kết quả đã được lưu để giáo viên theo dõi.</p>}
            </div>
          ))}
        </div>

        {!submitted && (
          <button onClick={() => handleSubmit(false)} className="w-full bg-blue-600 text-white py-4 rounded-xl font-bold text-lg hover:bg-blue-700 shadow-lg shadow-blue-500/30 transition-transform hover:-translate-y-1">{submitting ? "Đang chấm…" : "Nộp bài"}</button>
        )}
      </div>
    </main>
  );
}

export default function LamBaiPage() {
  return <Suspense fallback={<div className="p-10 text-center">Đang tải...</div>}><QuizContent /></Suspense>;
}
