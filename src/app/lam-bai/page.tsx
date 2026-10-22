"use client";
import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Clock, CheckCircle2, XCircle, Trophy, Loader2 } from "lucide-react";
import Link from "next/link";

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
  const [student, setStudent] = useState<any>(null);

  useEffect(() => {
    const session = localStorage.getItem('student_session');
    if (!session) { router.push('/login'); return; }
    setStudent(JSON.parse(session));

    const fetchQuiz = async () => {
      const { data: qz } = await supabase.from('quizzes').select('*').eq('id', quizId).single();
      const { data: qs } = await supabase.from('quiz_questions').select('*').eq('quiz_id', quizId).order('id');
      if (qz && qs) {
        setQuiz(qz);
        setQuestions(qs);
        setTimeLeft(qz.time_limit * 60);
      }
      setLoading(false);
    };
    fetchQuiz();
  }, [quizId, router]);

  useEffect(() => {
    if (loading || submitted || timeLeft <= 0) return;
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          handleSubmit(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [loading, submitted, timeLeft]);

  const handleSelect = (qId: string, optIndex: number) => {
    if (submitted) return;
    setAnswers({ ...answers, [qId]: optIndex });
  };

  const handleSubmit = async (autoSubmit = false) => {
    if (!autoSubmit && !confirm("Em có chắc chắn muốn nộp bài?")) return;
    
    let correctCount = 0;
    questions.forEach(q => {
      if (answers[q.id] === q.correct_option) correctCount++;
    });
    
    const finalScore = questions.length > 0 ? (correctCount / questions.length) * 10 : 0;
    setScore(finalScore);
    setSubmitted(true);

    if (student) {
      await supabase.from('quiz_submissions').insert([{
        quiz_id: quizId,
        student_id: student.id,
        score: finalScore
      }]);
    }
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-10 h-10 animate-spin text-blue-600"/></div>;
  if (!quiz) return <div className="min-h-screen text-center p-10 font-bold">Không tìm thấy bài trắc nghiệm.</div>;

  return (
    <main className="min-h-screen bg-gray-50 pb-20">
      <header className="bg-white shadow-sm sticky top-0 z-10 border-b">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <h1 className="font-bold text-lg text-gray-800 truncate pr-4">{quiz.title}</h1>
          {!submitted ? (
            <div className={`flex items-center gap-2 font-mono text-xl font-bold px-4 py-1.5 rounded-lg ${timeLeft < 60 ? 'bg-red-100 text-red-600 animate-pulse' : 'bg-blue-50 text-blue-700'}`}>
              <Clock className="w-5 h-5" /> {formatTime(timeLeft)}
            </div>
          ) : (
            <span className="font-bold text-green-600">Đã nộp bài</span>
          )}
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
              {q.image_url && <img src={q.image_url} alt="Hình ảnh câu hỏi" className="max-h-64 rounded-lg mb-4 object-contain border" />}
              
              <div className="grid md:grid-cols-2 gap-3">
                {q.options.map((opt: string, optIdx: number) => {
                  const isSelected = answers[q.id] === optIdx;
                  const isCorrect = q.correct_option === optIdx;
                  let btnClass = "border-gray-200 hover:border-blue-400 hover:bg-blue-50";
                  if (isSelected && !submitted) btnClass = "border-blue-600 bg-blue-50 ring-1 ring-blue-600";
                  if (submitted) {
                    if (isCorrect) btnClass = "border-green-500 bg-green-50";
                    else if (isSelected && !isCorrect) btnClass = "border-red-500 bg-red-50";
                    else btnClass = "border-gray-200 opacity-50";
                  }
                  return (
                    <button key={optIdx} onClick={() => handleSelect(q.id, optIdx)} disabled={submitted} className={`text-left p-4 rounded-xl border-2 transition-all flex items-center justify-between ${btnClass}`}>
                      <span className="font-medium"><span className="inline-block w-6 h-6 rounded-full bg-white border text-center leading-5 text-sm mr-2">{String.fromCharCode(65 + optIdx)}</span>{opt}</span>
                      {submitted && isCorrect && <CheckCircle2 className="w-5 h-5 text-green-600" />}
                      {submitted && isSelected && !isCorrect && <XCircle className="w-5 h-5 text-red-600" />}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {!submitted && (
          <button onClick={() => handleSubmit(false)} className="w-full bg-blue-600 text-white py-4 rounded-xl font-bold text-lg hover:bg-blue-700 shadow-lg shadow-blue-500/30 transition-transform hover:-translate-y-1">Nộp bài</button>
        )}
      </div>
    </main>
  );
}

export default function LamBaiPage() {
  return <Suspense fallback={<div className="p-10 text-center">Đang tải...</div>}><QuizContent /></Suspense>;
}