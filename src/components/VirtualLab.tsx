"use client";
import { useState } from "react";
import { createState, setVoltage, updateGeometry, disconnectSource, connectSource, calculateEnergy, CapacitorState } from "@/lib/physics";
import { markActivityComplete } from "@/lib/storage";

export default function VirtualLab({ activityId }: { activityId: number }) {
  const [state, setState] = useState<CapacitorState>(() => createState(100e-4, 1e-3, 1, 0, true));
  const [measurements, setMeasurements] = useState<Array<{ U: number; Q: number }>>([]);
  const [showGraph, setShowGraph] = useState(false);

  const handleUChange = (newU: number) => {
    if (!state.sourceConnected) return;
    setState(setVoltage(state, newU));
  };

  const handleToggleSource = () => {
    if (state.sourceConnected) setState(disconnectSource(state));
    else setState(connectSource(state, 5));
  };

  const recordMeasurement = () => {
    if (measurements.length >= 8) return;
    setMeasurements([...measurements, { U: state.U, Q: state.Q }]);
  };

  const drawGraph = () => {
    if (measurements.length < 5) {
      alert("Cần ít nhất 5 phép đo để vẽ đồ thị");
      return;
    }
    setShowGraph(true);
    markActivityComplete(activityId);
  };

  const maxU = Math.max(...measurements.map(m => m.U), 1);
  const maxQ = Math.max(...measurements.map(m => m.Q), 1);
  const W = 400, H = 300, pad = 40;
  const toX = (u: number) => pad + (u / maxU) * (W - 2 * pad);
  const toY = (q: number) => H - pad - (q / maxQ) * (H - 2 * pad);

  return (
    <div className="grid lg:grid-cols-2 gap-4">
      <div className="card space-y-4">
        <h3 className="font-semibold">Bảng điều khiển</h3>
        <div>
          <label className="text-sm text-gray-600">Hiệu điện thế U: {state.U.toFixed(2)} V</label>
          <input type="range" min="0" max="12" step="0.5" value={state.U} onChange={(e) => handleUChange(parseFloat(e.target.value))} disabled={!state.sourceConnected} className="w-full" />
        </div>
        <div>
          <label className="text-sm text-gray-600">Diện tích S: {(state.S * 10000).toFixed(0)} cm²</label>
          <input type="range" min="100" max="600" step="10" value={state.S * 10000} onChange={(e) => setState(updateGeometry(state, parseFloat(e.target.value) / 10000, state.d, state.epsilonR))} className="w-full" />
        </div>
        <div>
          <label className="text-sm text-gray-600">Khoảng cách d: {(state.d * 1000).toFixed(1)} mm</label>
          <input type="range" min="1" max="10" step="0.5" value={state.d * 1000} onChange={(e) => setState(updateGeometry(state, state.S, parseFloat(e.target.value) / 1000, state.epsilonR))} className="w-full" />
        </div>
        <button onClick={handleToggleSource} className={`btn w-full ${state.sourceConnected ? "btn-secondary" : "btn-primary"}`}>
          {state.sourceConnected ? "🔌 Ngắt nguồn" : "⚡ Nối nguồn 5V"}
        </button>
        <div className="grid grid-cols-3 gap-2 pt-2">
          <div className="bg-blue-50 p-3 rounded-lg text-center">
            <div className="text-xs text-gray-600">C</div>
            <div className="font-mono font-bold text-blue-700">{(state.C * 1e12).toFixed(1)} pF</div>
          </div>
          <div className="bg-green-50 p-3 rounded-lg text-center">
            <div className="text-xs text-gray-600">Q</div>
            <div className="font-mono font-bold text-green-700">{(state.Q * 1e9).toFixed(2)} nC</div>
          </div>
          <div className="bg-orange-50 p-3 rounded-lg text-center">
            <div className="text-xs text-gray-600">W</div>
            <div className="font-mono font-bold text-orange-700">{(calculateEnergy(state.C, state.U) * 1e9).toFixed(2)} nJ</div>
          </div>
        </div>
        <div className="text-xs text-gray-500">
          Trạng thái: {state.sourceConnected ? "🟢 Đang nối nguồn (U cố định)" : "🔴 Đã ngắt nguồn (Q cố định)"}
        </div>
      </div>

      <div className="card space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">Bảng dữ liệu ({measurements.length})</h3>
          <button onClick={recordMeasurement} className="btn btn-success text-sm" disabled={measurements.length >= 8}>+ Ghi phép đo</button>
        </div>
        <div className="max-h-48 overflow-y-auto border rounded-lg">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 sticky top-0">
              <tr>
                <th className="p-2 text-left">#</th>
                <th className="p-2 text-left">U (V)</th>
                <th className="p-2 text-left">Q (nC)</th>
                <th className="p-2 text-left">Q/U</th>
              </tr>
            </thead>
            <tbody>
              {measurements.map((m, i) => (
                <tr key={i} className="border-t">
                  <td className="p-2">{i + 1}</td>
                  <td className="p-2 font-mono">{m.U.toFixed(2)}</td>
                  <td className="p-2 font-mono">{(m.Q * 1e9).toFixed(2)}</td>
                  <td className="p-2 font-mono text-blue-600">{((m.Q / m.U) * 1e12).toFixed(1)}</td>
                </tr>
              ))}
              {measurements.length === 0 && (
                <tr><td colSpan={4} className="p-4 text-center text-gray-400">Chưa có phép đo nào</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <button onClick={drawGraph} className="btn btn-primary w-full" disabled={measurements.length < 5}>📈 Vẽ đồ thị Q = f(U)</button>
        {showGraph && measurements.length >= 5 && (
          <div className="border rounded-lg p-2 bg-white">
            <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
              <line x1={pad} y1={H-pad} x2={W-pad} y2={H-pad} stroke="#374151" strokeWidth="2" />
              <line x1={pad} y1={pad} x2={pad} y2={H-pad} stroke="#374151" strokeWidth="2" />
              <text x={W/2} y={H-10} textAnchor="middle" fontSize="12" fill="#374151">U (V)</text>
              <text x={10} y={H/2} textAnchor="middle" fontSize="12" fill="#374151" transform={`rotate(-90 10 ${H/2})`}>Q (nC)</text>
              {measurements.map((m, i) => (
                <circle key={i} cx={toX(m.U)} cy={toY(m.Q)} r="4" fill="#3B82F6" />
              ))}
              {measurements.length >= 2 && (
                <line x1={toX(0)} y1={toY(0)} x2={toX(maxU)} y2={toY(maxQ)} stroke="#10B981" strokeWidth="2" strokeDasharray="4" />
              )}
            </svg>
            <div className="text-sm text-center mt-2 text-gray-600">Đường thẳng đi qua gốc → Q tỉ lệ thuận với U. Slope ≈ C</div>
          </div>
        )}
      </div>
    </div>
  );
}