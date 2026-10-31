"use client";

import { useState, useEffect, useMemo } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Play, Pause, RotateCcw, Download, AlertTriangle } from "lucide-react";

interface Measurement {
  U: number;
  Q: number;
}

interface LabData {
  plateArea: number;
  plateDistance: number;
  dielectricConstant: number;
  measurements: Measurement[];
}

const EPSILON_0 = 8.854187817e-12;

function VirtualLab() {
  const [data, setData] = useState<LabData>({
    plateArea: 0.01,
    plateDistance: 0.001,
    dielectricConstant: 1,
    measurements: [],
  });
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const theoreticalC = useMemo(() => {
    return (EPSILON_0 * data.dielectricConstant * data.plateArea) / data.plateDistance;
  }, [data.plateArea, data.plateDistance, data.dielectricConstant]);

  const regressionData = useMemo(() => {
    const measurements = data.measurements.filter(m => m.U > 0 && m.Q > 0);
    if (measurements.length < 2) return { slope: 0, maxU: 0, maxQ: 0, points: [] };

    const sumUQ = measurements.reduce((sum, m) => sum + m.U * m.Q, 0);
    const sumU2 = measurements.reduce((sum, m) => sum + m.U * m.U, 0);
    const slope = sumU2 > 0 ? sumUQ / sumU2 : 0;

    const maxU = Math.max(...measurements.map(m => m.U), 1e-12);
    const maxQ = Math.max(...measurements.map(m => m.Q), 1e-12);

    const regPoints = [
      { U: 0, Q: 0 },
      { U: maxU, Q: slope * maxU },
    ];

    return { slope, maxU, maxQ, points: regPoints };
  }, [data.measurements]);

  const addMeasurement = () => {
    const U = Math.random() * 10 + 1;
    const noise = (Math.random() - 0.5) * 0.1;
    const Q = Math.max(0, theoreticalC * (Math.random() * 10 + 1) + noise * 1e-9);

    setData(prev => ({
      ...prev,
      measurements: [...prev.measurements, { U, Q }],
    }));
  };

  const handleStart = () => {
    setError(null);
    if (data.plateArea <= 0 || data.plateDistance <= 0) {
      setError("Diện tích và khoảng cách phải > 0");
      return;
    }
    setIsRunning(true);
    const interval = setInterval(() => {
      if (data.measurements.length >= 10) {
        clearInterval(interval);
        setIsRunning(false);
      } else {
        addMeasurement();
      }
    }, 500);
  };

  const handleReset = () => {
    setData(prev => ({ ...prev, measurements: [] }));
    setIsRunning(false);
    setError(null);
  };

  const exportData = () => {
    const csv = [
      "U (V),Q (C)",
      ...data.measurements.map(m => `${m.U.toFixed(3)},${m.Q.toExponential(3)}`),
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "virtual-lab-data.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="bg-white p-6 rounded-2xl shadow-xl space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-blue-700">Phòng Lab Ảo: Tụ điện</h2>
        <div className="flex gap-2">
          <button onClick={exportData} className="btn btn-secondary" disabled={data.measurements.length === 0}>
            <Download className="w-4 h-4 mr-1" /> Xuất CSV
          </button>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-4 p-4 bg-gray-50 rounded-xl">
        <div>
          <label className="text-sm font-medium text-gray-700">Diện tích cực (m²)</label>
          <input
            type="number"
            step="0.001"
            min="0.001"
            value={data.plateArea}
            onChange={e => setData(d => ({ ...d, plateArea: parseFloat(e.target.value) }))}
            className="w-full mt-1 p-2 border rounded-xl bg-white focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="text-sm font-medium text-gray-700">Khoảng cách (m)</label>
          <input
            type="number"
            step="0.0001"
            min="0.0001"
            value={data.plateDistance}
            onChange={e => setData(d => ({ ...d, plateDistance: parseFloat(e.target.value) }))}
            className="w-full mt-1 p-2 border rounded-xl bg-white focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="text-sm font-medium text-gray-700">Hằng số điện môi (εr)</label>
          <input
            type="number"
            step="0.1"
            min="1"
            value={data.dielectricConstant}
            onChange={e => setData(d => ({ ...d, dielectricConstant: parseFloat(e.target.value) }))}
            className="w-full mt-1 p-2 border rounded-xl bg-white focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      <div className="flex gap-3 flex-wrap">
        <button onClick={handleStart} disabled={isRunning} className="btn btn-primary">
          {isRunning ? <Pause className="w-4 h-4 mr-1" /> : <Play className="w-4 h-4 mr-1" />}
          {isRunning ? "Đang chạy..." : "Bắt đầu đo"}
        </button>
        <button onClick={handleReset} className="btn btn-secondary">
          <RotateCcw className="w-4 h-4 mr-1" /> Reset
        </button>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-red-600" />
          <span className="text-red-700">{error}</span>
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-4 p-4 bg-blue-50 rounded-xl">
        <div>
          <p className="text-sm text-gray-600">Điện dung lý thuyết</p>
          <p className="text-2xl font-bold text-blue-700">{theoreticalC.toExponential(2)} F</p>
        </div>
        <div>
          <p className="text-sm text-gray-600">Điện dung thực nghiệm (hồi quy)</p>
          <p className="text-2xl font-bold text-blue-700">{data.measurements.length > 1 ? regressionData.slope.toExponential(2) : "—"} F</p>
        </div>
      </div>

      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data.measurements}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="U" name="Điện áp U (V)" unit="V" />
            <YAxis dataKey="Q" name="Điện tích Q (C)" unit="C" />
            <Tooltip
              formatter={(value: any) => [value.toExponential(3), "Q (C)"]}
              labelFormatter={(value: any) => `${value.toFixed(2)} V`}
            />
              <Line
                type="monotone"
                dataKey="Q"
                stroke="#3b82f6"
                strokeWidth={2}
                dot={{ r: 4, strokeWidth: 2, stroke: "#3b82f6", fill: "white" }}
              />
            {data.measurements.length > 1 && (
              <Line
                type="linear"
                data={regressionData.points}
                dataKey="Q"
                stroke="#ef4444"
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={false}
              />
            )}
        </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 text-left text-gray-600">
              <th className="p-3">STT</th>
              <th className="p-3">U (V)</th>
              <th className="p-3">Q (C)</th>
              <th className="p-3">C = Q/U (F)</th>
            </tr>
          </thead>
          <tbody>
            {data.measurements.map((m, i) => (
              <tr key={i} className="border-t border-gray-100 hover:bg-gray-50">
                <td className="p-3">{i + 1}</td>
                <td className="p-3">{m.U.toFixed(2)}</td>
                <td className="p-3">{m.Q.toExponential(3)}</td>
                <td className="p-3 font-mono text-blue-600">
                  {m.U > 0 ? (m.Q / m.U).toExponential(2) : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default VirtualLab;