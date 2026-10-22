"use client";
import { useState } from "react";
import { markActivityComplete } from "@/lib/storage";

type Q = { id: string; question: string; options: string[]; correct: number };

export default function Quiz({ activityId, questions }: { activityId: number; questions: Q[] }) {
  const [current, setCurrent] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);

  const q = questions[current];

  const submit = () => {
    if (selected === null) return;
    const isCorrect = selected === q.correct;
    if (isCorrect) setScore(score + 1);
    if (current + 1 >= questions.length) {
      setFinished(true);
      markActivityComplete(activityId);
    } else {
      setCurrent(current + 1);
      setSelected(null);
    }
  };

  if (finished) {
    return (
      <div className="card text-center space-y-4">
        <div className="text-6xl">🎉</div>
        <h3 className="text-2xl font-bold">Hoàn thành!</h3>
        <p className="text-lg">Điểm: <span className="text-blue-600 font-bold">{score}/{questions.length}</span></p>
        <button onClick={() => { setCurrent(0); setSelected(null); setScore(0); setFinished(false); }} className="btn btn-secondary">Làm lại</button>
      </div>
    );
  }

  return (
    <div className="card space-y-4">
      <div className="flex items-center justify-between text-sm text-gray-600">
        <span>Câu {current + 1}/{questions.length}</span>
        <span>Điểm: {score}</span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div className="bg-blue-600 h-2 rounded-full" style={{ width: `${((current + 1) / questions.length) * 100}%` }} />
      </div>
      <h3 className="text-lg font-semibold">{q.question}</h3>
      <div className="space-y-2">
        {q.options.map((opt, i) => (
          <label key={i} className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer ${selected === i ? "border-blue-500 bg-blue-50" : "border-gray-200 hover:bg-gray-50"}`}>
            <input type="radio" name={`q${q.id}`} checked={selected === i} onChange={() => setSelected(i)} />
            <span>{opt}</span>
          </label>
        ))}
      </div>
      <button onClick={submit} disabled={selected === null} className="btn btn-primary w-full">
        {current + 1 >= questions.length ? "Hoàn thành" : "Câu tiếp theo →"}
      </button>
    </div>
  );
}