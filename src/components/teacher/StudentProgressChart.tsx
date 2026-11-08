"use client";
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

type ActivityScore = { label: string; score: number | null; done: boolean };

/**
 * Biểu đồ tiến độ theo từng hoạt động của một học sinh.
 * Cột màu theo mức điểm: xanh >=8, vàng >=5, đỏ <5; xám = chưa làm.
 */
export default function StudentProgressChart({ data }: { data: ActivityScore[] }) {
  if (!data.length) {
    return <p className="rounded-xl border border-dashed border-slate-200 p-4 text-center text-xs text-slate-400">Chưa có dữ liệu hoạt động để vẽ biểu đồ.</p>;
  }
  const colorFor = (item: ActivityScore) => {
    if (!item.done || item.score === null) return "#cbd5e1";
    if (item.score >= 8) return "#10b981";
    if (item.score >= 5) return "#f59e0b";
    return "#f43f5e";
  };
  return (
    <div className="h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, bottom: 8, left: -20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
          <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#64748b" }} interval={0} angle={-20} textAnchor="end" height={50} />
          <YAxis domain={[0, 10]} tick={{ fontSize: 10, fill: "#64748b" }} />
          <Tooltip
            formatter={(value) => [value === null ? "Chưa làm" : `${value} điểm`, "Điểm"]}
            labelFormatter={(label) => `Hoạt động ${label}`}
          />
          <Bar dataKey="score" radius={[6, 6, 0, 0]}>
            {data.map((item, index) => <Cell key={index} fill={colorFor(item)} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
