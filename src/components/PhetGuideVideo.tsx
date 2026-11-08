"use client";

import { useRef, useState } from "react";
import { ExternalLink, Lightbulb, Pause, Play, RotateCcw, Youtube } from "lucide-react";
import PhetGuideQuestion, { type ActiveQuestion } from "@/components/PhetGuideQuestion";
import { GUIDE_QUESTIONS, PHET_EMBED_URL, PHET_SIM_URL, PHET_VIDEO_URL, type GuideQuestion } from "@/lib/data/phet-guide";
export default function PhetGuideVideo() {
  const [started, setStarted] = useState(false);
  const [paused, setPaused] = useState(false);
  const [notice, setNotice] = useState("");
  const [activeQuestion, setActiveQuestion] = useState<ActiveQuestion | null>(null);
  const [answered, setAnswered] = useState<Record<string, { correct: boolean; selected: number }>>({});
  const iframeRef = useRef<HTMLIFrameElement | null>(null);

  const playVideo = () => { setStarted(true); setPaused(false); setNotice("Đang phát video. Video tạm dừng tại các câu hỏi để em trả lời."); };
  const pauseVideo = () => { setPaused(true); setNotice("Đã tạm dừng. Bấm “Tiếp tục xem” để tiếp tục."); };
  const resumeVideo = () => { setPaused(false); setNotice("Đang tiếp tục xem."); };
  const restartVideo = () => { setStarted(false); setPaused(false); setActiveQuestion(null); setNotice("Đã đặt lại video. Bấm “Phát video” để bắt đầu lại từ đầu."); };

  const openQuestion = (question: GuideQuestion) => {
    setActiveQuestion({ question, selected: null, checked: false, correct: false });
    setPaused(true);
    setNotice(`Câu hỏi tại giây ${question.at}: hãy chọn đáp án rồi bấm “Kiểm tra câu trả lời”.`);
  };
  const checkAnswer = () => {
    if (!activeQuestion || activeQuestion.selected === null) return;
    const correct = activeQuestion.selected === activeQuestion.question.answer;
    setActiveQuestion({ ...activeQuestion, checked: true, correct });
    setAnswered((current) => ({ ...current, [activeQuestion.question.id]: { correct, selected: activeQuestion.selected as number } }));
    setNotice(correct ? "Chính xác! Bấm “Tiếp tục xem” để tiếp tục video." : "Chưa đúng. Hãy xem lại đoạn video liên quan rồi thử lại.");
  };
  const closeQuestion = () => { setActiveQuestion(null); setPaused(false); setNotice("Đã lưu câu trả lời. Đang tiếp tục xem video."); };

  return (
    <section className="rounded-3xl border border-indigo-200 bg-white shadow-sm overflow-hidden">
      <div className="p-4 border-b bg-gradient-to-r from-indigo-50 to-indigo-50">
        <h3 className="font-bold text-base text-indigo-900 flex items-center gap-2">
          <Youtube className="h-5 w-5 text-indigo-600" /> Video hướng dẫn thực hành mô phỏng PhET
        </h3>
        <p className="text-[11px] text-indigo-700/80 mt-1">
          Mô phỏng <strong>PhET – Capacitor Lab: Basics</strong>. Video tạm dừng tại các câu hỏi tương tác; em có thể xem lại đoạn liên quan.
        </p>
        <p className="text-[10px] text-indigo-600 mt-1 break-all">Đường dẫn video: {PHET_VIDEO_URL}</p>
      </div>
      <div className="p-4 space-y-4">
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={playVideo} className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white hover:bg-indigo-700"><Play className="h-4 w-4" /> Phát video</button>
          <button type="button" onClick={pauseVideo} disabled={!started} className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-40"><Pause className="h-4 w-4" /> Tạm dừng</button>
          <button type="button" onClick={resumeVideo} disabled={!started || !paused} className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-40"><Play className="h-4 w-4" /> Tiếp tục xem</button>
          <button type="button" onClick={restartVideo} disabled={!started} className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-40"><RotateCcw className="h-4 w-4" /> Xem lại đoạn video</button>
        </div>
        <div className="relative aspect-video w-full overflow-hidden rounded-2xl bg-slate-950">
          {!started ? (
            <button type="button" onClick={playVideo} className="absolute inset-0 grid place-items-center text-white">
              <span className="text-center">
                <span className="mx-auto mb-3 grid h-16 w-16 place-items-center rounded-full bg-indigo-600"><Play className="h-8 w-8" /></span>
                <span className="block text-sm font-bold">Phát video hướng dẫn PhET</span>
                <span className="mt-1 block text-xs text-slate-300">Virtual Capacitor Lab Guide | Using PhET Simulations</span>
              </span>
            </button>
          ) : (
            <iframe ref={iframeRef} title="Video hướng dẫn PhET Capacitor Lab" src={PHET_EMBED_URL} className="h-full w-full" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowFullScreen />
          )}
        </div>
        <div className="space-y-2">
          <p className="text-xs font-bold text-slate-700">Câu hỏi tương tác trong video</p>
          <div className="grid gap-2 sm:grid-cols-2">
            {GUIDE_QUESTIONS.map((question) => {
              const done = answered[question.id];
              return (
                <button key={question.id} type="button" onClick={() => openQuestion(question)} className={`rounded-xl border p-3 text-left text-xs transition-all ${done ? (done.correct ? "border-emerald-200 bg-emerald-50" : "border-amber-200 bg-amber-50") : "border-slate-200 bg-white hover:border-indigo-300"}`}>
                  <span className="font-bold text-slate-800">Câu {question.id.slice(1)} · {question.at}s</span>
                  <span className="mt-1 block text-slate-600">{question.prompt}</span>
                  {done ? <span className={`mt-1 block font-bold ${done.correct ? "text-emerald-700" : "text-amber-700"}`}>{done.correct ? "Đã đúng" : "Chưa đúng — thử lại"}</span> : null}
                </button>
              );
            })}
          </div>
        </div>
        {activeQuestion ? (
          <PhetGuideQuestion active={activeQuestion} onCheck={checkAnswer} onContinue={closeQuestion} onSelect={(index) => setActiveQuestion({ ...activeQuestion, selected: index })} />
        ) : null}
        {notice ? <p className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700 flex items-center gap-2"><Lightbulb className="h-4 w-4 text-amber-500" /> {notice}</p> : null}
        <div className="flex flex-wrap gap-2">
          <a href={PHET_VIDEO_URL} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"><ExternalLink className="h-3.5 w-3.5" /> Mở video trên YouTube</a>
          <a href={PHET_SIM_URL} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3 py-2 text-xs font-bold text-white hover:bg-indigo-700"><ExternalLink className="h-3.5 w-3.5" /> Bắt đầu thực hành mô phỏng PhET</a>
        </div>
      </div>
    </section>
  );
}

