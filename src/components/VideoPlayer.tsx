"use client";
import { useRef, useState } from "react";
import { markActivityComplete } from "@/lib/storage";

type Checkpoint = {
  time: number;
  question: string;
  options: string[];
  correctIndex: number;
};

type Props = {
  activityId: number;
  src: string;
  checkpoints: Checkpoint[];
};

export default function VideoPlayer({ activityId, src, checkpoints }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [watchedRanges, setWatchedRanges] = useState<Array<[number, number]>>([]);
  const [activeCheckpoint, setActiveCheckpoint] = useState<Checkpoint | null>(null);
  const [answered, setAnswered] = useState<number[]>([]);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);

  const isAllowedToSeek = (targetTime: number): boolean => {
    return watchedRanges.some(([start, end]) => targetTime >= start && targetTime <= end + 1);
  };

  const handleTimeUpdate = () => {
    const v = videoRef.current;
    if (!v || activeCheckpoint) return;

    const t = v.currentTime;
    setWatchedRanges((prev) => {
      if (prev.length === 0) return [[0, t]];
      const last = prev[prev.length - 1];
      if (t > last[1] && t - last[1] < 2) {
        return [...prev.slice(0, -1), [last[0], t]];
      }
      if (t < last[1] - 2) return [...prev, [t, t]];
      return prev;
    });

    const nextCp = checkpoints.find(cp => !answered.includes(checkpoints.indexOf(cp)) && t >= cp.time && t < cp.time + 1);
    if (nextCp) {
      v.pause();
      setActiveCheckpoint(nextCp);
      setSelectedAnswer(null);
    }
  };

  const handleSeeking = () => {
    const v = videoRef.current;
    if (!v) return;
    if (!isAllowedToSeek(v.currentTime)) {
      const last = watchedRanges[watchedRanges.length - 1];
      v.currentTime = last ? last[1] : 0;
    }
  };

  const submitCheckpoint = () => {
    if (!activeCheckpoint || selectedAnswer === null) return;
    const idx = checkpoints.indexOf(activeCheckpoint);
    setAnswered([...answered, idx]);
    setActiveCheckpoint(null);
    videoRef.current?.play();

    if (answered.length + 1 === checkpoints.length) {
      markActivityComplete(activityId);
    }
  };

  return (
    <div className="space-y-4">
      <div className="relative bg-black rounded-xl overflow-hidden">
        <video
          ref={videoRef}
          src={src}
          controls
          onTimeUpdate={handleTimeUpdate}
          onSeeking={handleSeeking}
          className="w-full aspect-video"
          controlsList="nodownload"
        />
        {activeCheckpoint && (
          <div className="absolute inset-0 bg-black/70 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl p-6 max-w-lg w-full">
              <div className="text-sm text-blue-600 font-medium mb-2">CHECKPOINT</div>
              <h3 className="text-lg font-semibold mb-4">{activeCheckpoint.question}</h3>
              <div className="space-y-2">
                {activeCheckpoint.options.map((opt, i) => (
                  <label key={i} className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer ${selectedAnswer === i ? "border-blue-500 bg-blue-50" : "border-gray-200 hover:bg-gray-50"}`}>
                    <input type="radio" name="cp" checked={selectedAnswer === i} onChange={() => setSelectedAnswer(i)} />
                    <span>{opt}</span>
                  </label>
                ))}
              </div>
              <button onClick={submitCheckpoint} disabled={selectedAnswer === null} className="btn btn-primary w-full mt-4">
                Nộp câu trả lời & Tiếp tục
              </button>
            </div>
          </div>
        )}
      </div>
      <div className="text-sm text-gray-600">
        📍 Đã xem: {watchedRanges.length > 0 ? `${Math.round(watchedRanges[watchedRanges.length-1][1])}s` : "0s"} / Checkpoint: {answered.length}/{checkpoints.length}
      </div>
    </div>
  );
}