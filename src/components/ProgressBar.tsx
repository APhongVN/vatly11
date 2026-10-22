"use client";
import { useEffect, useState } from "react";
import { ACTIVITIES } from "@/lib/data/activities";
import { getCompletedCount } from "@/lib/storage";

export default function ProgressBar() {
  const [done, setDone] = useState(0);
  useEffect(() => { setDone(getCompletedCount()); }, []);
  const pct = (done / ACTIVITIES.length) * 100;
  return (
    <div className="card">
      <div className="flex items-center justify-between mb-2">
        <span className="font-medium">Tiến độ tổng</span>
        <span className="text-sm text-gray-600">{done}/{ACTIVITIES.length} hoạt động</span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-3">
        <div className="bg-gradient-to-r from-blue-500 to-green-500 h-3 rounded-full transition-all" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}