"use client";
import { useEffect, useState } from "react";
import { ACTIVITIES } from "@/lib/data/activities";
import { getCompletedCount } from "@/lib/storage";
import { Trophy } from "lucide-react";

export default function ProgressBar() {
  const [done, setDone] = useState(0);
  useEffect(() => { setDone(getCompletedCount()); }, []);
  const pct = (done / ACTIVITIES.length) * 100;
  
  return (
    <div className="card bg-gradient-to-r from-blue-600 to-indigo-600 text-white border-0">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-white/20 rounded-lg">
            <Trophy className="w-6 h-6 text-yellow-300" />
          </div>
          <div>
            <div className="font-semibold text-lg">Tiến độ học tập</div>
            <div className="text-blue-100 text-sm">Cố lên, em sắp hoàn thành rồi!</div>
          </div>
        </div>
        <div className="text-3xl font-bold">{Math.round(pct)}%</div>
      </div>
      <div className="w-full bg-black/20 rounded-full h-4 overflow-hidden">
        <div className="bg-gradient-to-r from-yellow-400 to-yellow-200 h-full rounded-full transition-all duration-1000 ease-out relative" style={{ width: `${pct}%` }}>
          <div className="absolute top-0 bottom-0 left-0 right-0 bg-white/20 animate-pulse"></div>
        </div>
      </div>
      <div className="mt-2 text-right text-sm text-blue-100 font-medium">{done} / {ACTIVITIES.length} hoạt động</div>
    </div>
  );
}