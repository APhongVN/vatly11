"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Line, LineChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Download, Loader2, Save, CheckCircle2, Play, Unplug, Lightbulb, AlertCircle } from "lucide-react";

const EPSILON_0 = 8.854187817e-12;
const STATIONS = [
  { id: "charge-discharge", title: "1 · Cấu tạo, tích điện, phóng điện", question: "Tụ giữ điện tích thế nào sau khi nguồn bị ngắt?" },
  { id: "charge-voltage", title: "2 · Khảo sát quan hệ Q–U", question: "Khi giữ C không đổi, Q thay đổi thế nào theo U?" },
  { id: "capacitance-factors", title: "3 · Các yếu tố ảnh hưởng điện dung", question: "S, d và điện môi làm thay đổi C ra sao?" },
  { id: "source-state", title: "4 · Còn nối nguồn và đã ngắt nguồn", question: "Đại lượng nào được giữ ổn định trong từng trạng thái?" },
  { id: "circuit-builder", title: "5 · Mô hình ghép tụ", question: "Q, U và C tương đương thay đổi thế nào khi ghép tụ?" },
  { id: "energy-graph", title: "6 · Năng lượng qua đồ thị U=f(Q)", question: "Diện tích dưới đồ thị biểu diễn đại lượng nào?" },
] as const;
type StationId = typeof STATIONS[number]["id"];
type Notes = { prediction: string; evidence: string; conclusion: string };
type Measurement = { U: number; Q: number };
type StationEvidence = { notes: Notes; [key: string]: unknown };
type LabEvidence = { kind: "virtual-lab"; stations: Partial<Record<StationId, StationEvidence>> };
const emptyNotes = (): Notes => ({ prediction: "", evidence: "", conclusion: "" });
const createEmptyStations = (): Record<StationId, StationEvidence> => Object.fromEntries(STATIONS.map(({ id }) => [id, { notes: emptyNotes() }])) as Record<StationId, StationEvidence>;

export default function VirtualLab({ activityId = 4 }: { activityId?: number }) {
  const [activeStation, setActiveStation] = useState<StationId>(STATIONS[0].id);
  const [notes, setNotes] = useState<Record<StationId, Notes>>(Object.fromEntries(STATIONS.map(({ id }) => [id, emptyNotes()])) as Record<StationId, Notes>);
  const [stationData, setStationData] = useState<Record<StationId, Record<string, unknown>>>(Object.fromEntries(STATIONS.map(({ id }) => [id, {}])) as Record<StationId, Record<string, unknown>>);
  const [previewMode, setPreviewMode] = useState(false);
  const [readOnly, setReadOnly] = useState(false);
  const [loadState, setLoadState] = useState<"loading" | "ready" | "unavailable">("loading");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const [plateArea, setPlateArea] = useState(0.01);
  const [plateDistance, setPlateDistance] = useState(0.001);
  const [dielectric, setDielectric] = useState(2);
  const capacitance = useMemo(() => plateDistance > 0 ? EPSILON_0 * dielectric * plateArea / plateDistance : 0, [plateArea, plateDistance, dielectric]);

  const [charge, setCharge] = useState(0);
  const [initialCharge, setInitialCharge] = useState(0);
  const [sourceConnected, setSourceConnected] = useState(false);
  const [loadConnected, setLoadConnected] = useState(false);
  const dischargeTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const [measurements, setMeasurements] = useState<Measurement[]>([]);
  const [factorName, setFactorName] = useState<"area" | "distance" | "dielectric">("area");
  const [isolatedCharge, setIsolatedCharge] = useState(capacitance * 12);
  const [sourceMode, setSourceMode] = useState(true);
  const [circuitC1, setCircuitC1] = useState(4);
  const [circuitC2, setCircuitC2] = useState(6);
  const [circuitVoltage, setCircuitVoltage] = useState(12);
  const [topology, setTopology] = useState<"series" | "parallel">("series");
  const [energyCapacitance, setEnergyCapacitance] = useState(10);
  const [energyVoltage, setEnergyVoltage] = useState(10);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/activity-evidence?activityId=${activityId}`, { cache: "no-store" })
      .then(async (response) => {
        if (response.status === 401) { if (!cancelled) { setPreviewMode(true); setLoadState("ready"); } return null; }
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "Không tải được sổ tay.");
        return result.record;
      })
      .then((record) => {
        if (cancelled || !record) return;
        const evidence = record.evidence as LabEvidence;
        if (evidence?.kind !== "virtual-lab" || !evidence.stations) return;
        const nextNotes = { ...notes };
        const nextData = { ...stationData };
        for (const station of STATIONS) {
          const saved = evidence.stations[station.id];
          if (!saved) continue;
          nextNotes[station.id] = { ...emptyNotes(), ...saved.notes };
          const { notes: _savedNotes, ...rest } = saved;
          nextData[station.id] = rest;
        }
        setNotes(nextNotes);
        setStationData(nextData);
        const savedPoints = evidence.stations["charge-voltage"]?.measurements;
        if (Array.isArray(savedPoints)) setMeasurements(savedPoints as Measurement[]);
        const savedCharge = evidence.stations["charge-discharge"]?.charge;
        if (typeof savedCharge === "number") setCharge(savedCharge);
        const savedInitialCharge = evidence.stations["charge-discharge"]?.initialCharge;
        if (typeof savedInitialCharge === "number") setInitialCharge(savedInitialCharge);
        const savedSource = evidence.stations["charge-discharge"]?.sourceConnected;
        if (typeof savedSource === "boolean") setSourceConnected(savedSource);
        const savedLoad = evidence.stations["charge-discharge"]?.loadConnected;
        if (typeof savedLoad === "boolean") setLoadConnected(savedLoad);
        const qU = evidence.stations["charge-voltage"];
        if (typeof qU?.plateArea === "number") setPlateArea(qU.plateArea);
        if (typeof qU?.plateDistance === "number") setPlateDistance(qU.plateDistance);
        if (typeof qU?.dielectric === "number") setDielectric(qU.dielectric);
        const factorStudy = evidence.stations["capacitance-factors"]?.selectedFactor;
        if (factorStudy === "area" || factorStudy === "distance" || factorStudy === "dielectric") setFactorName(factorStudy);
        const sourceStudy = evidence.stations["source-state"];
        if (typeof sourceStudy?.sourceConnected === "boolean") setSourceMode(sourceStudy.sourceConnected);
        if (typeof sourceStudy?.isolatedCharge === "number") setIsolatedCharge(sourceStudy.isolatedCharge);
        const circuitStudy = evidence.stations["circuit-builder"];
        if (typeof circuitStudy?.capacitance1 === "number") setCircuitC1(circuitStudy.capacitance1);
        if (typeof circuitStudy?.capacitance2 === "number") setCircuitC2(circuitStudy.capacitance2);
        if (typeof circuitStudy?.sourceVoltage === "number") setCircuitVoltage(circuitStudy.sourceVoltage);
        if (circuitStudy?.topology === "series" || circuitStudy?.topology === "parallel") setTopology(circuitStudy.topology);
        const energyStudy = evidence.stations["energy-graph"];
        if (typeof energyStudy?.capacitanceMicrofarad === "number") setEnergyCapacitance(energyStudy.capacitanceMicrofarad);
        if (typeof energyStudy?.voltageMax === "number") setEnergyVoltage(energyStudy.voltageMax);
        setReadOnly(Boolean(record.completed_at));
      })
      .catch((loadError: unknown) => { if (!cancelled) { setError(loadError instanceof Error ? loadError.message : "Không tải được sổ tay."); setLoadState("unavailable"); } })
      .finally(() => { if (!cancelled) setLoadState((current) => current === "loading" ? "ready" : current); });
    return () => { cancelled = true; if (dischargeTimer.current) clearInterval(dischargeTimer.current); };
    // Load only once for this activity; state callbacks below preserve the current user edits.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activityId]);

  const changeNote = (key: keyof Notes, value: string) => {
    setNotes((current) => ({ ...current, [activeStation]: { ...current[activeStation], [key]: value } }));
  };
  const updateStationData = (id: StationId, patch: Record<string, unknown>) => setStationData((current) => ({ ...current, [id]: { ...current[id], ...patch } }));
  const recordLabEvent = (event: string) => {
    const entry = `${new Date().toISOString()} · ${event}`;
    setStationData((current) => ({
      ...current,
      "charge-discharge": {
        ...current["charge-discharge"],
        events: [...((current["charge-discharge"].events as string[] | undefined) || []), entry],
      },
    }));
  };

  const chargeCapacitor = () => {
    const nextCharge = capacitance * 5;
    setCharge(nextCharge);
    setInitialCharge(nextCharge);
    setSourceConnected(true);
    setLoadConnected(false);
    recordLabEvent("Nối nguồn 5 V và nạp tụ");
  };
  const disconnectSource = () => {
    setSourceConnected(false);
    setLoadConnected(false);
    setIsolatedCharge(charge);
    recordLabEvent("Ngắt nguồn; điện tích được giữ trong mô hình lí tưởng");
  };
  const connectLoad = () => {
    if (charge <= 0 || sourceConnected) return;
    setLoadConnected(true);
    recordLabEvent("Nối tải LED và điện trở hạn dòng");
    if (dischargeTimer.current) clearInterval(dischargeTimer.current);
    let ticks = 0;
    dischargeTimer.current = setInterval(() => {
      ticks += 1;
      setCharge((current) => Math.max(0, current * 0.72));
      if (ticks >= 18) {
        if (dischargeTimer.current) clearInterval(dischargeTimer.current);
        dischargeTimer.current = null;
        setLoadConnected(false);
        setCharge(0);
        recordLabEvent("Tụ phóng gần hết điện tích qua tải");
      }
    }, 250);
  };

  const takeMeasurement = () => {
    if (measurements.length >= 10) return;
    const U = measurements.length + 1;
    const randomMeasurementError = 1 + (Math.random() - 0.5) * 0.01;
    const Q = capacitance * U * randomMeasurementError;
    const next = [...measurements, { U, Q }];
    setMeasurements(next);
    updateStationData("charge-voltage", { measurements: next, plateArea, plateDistance, dielectric });
  };
  const clearMeasurements = () => { setMeasurements([]); updateStationData("charge-voltage", { measurements: [] }); };

  const measurementsFit = useMemo(() => {
    const denominator = measurements.reduce((sum, point) => sum + point.U * point.U, 0);
    const numerator = measurements.reduce((sum, point) => sum + point.U * point.Q, 0);
    return denominator > 0 ? numerator / denominator : null;
  }, [measurements]);
  const factorRows = useMemo(() => {
    const baseline = { plateArea, plateDistance, dielectric };
    const values = factorName === "area" ? [plateArea / 2, plateArea, plateArea * 2]
      : factorName === "distance" ? [plateDistance / 2, plateDistance, plateDistance * 2]
        : [Math.max(1, dielectric / 2), dielectric, dielectric * 2];
    return values.map((value) => {
      const candidate = { ...baseline, ...(factorName === "area" ? { plateArea: value } : factorName === "distance" ? { plateDistance: value } : { dielectric: value }) };
      return { value, capacitance: EPSILON_0 * candidate.dielectric * candidate.plateArea / candidate.plateDistance };
    });
  }, [factorName, plateArea, plateDistance, dielectric]);
  const changedCapacitance = useMemo(() => EPSILON_0 * dielectric * plateArea / plateDistance, [plateArea, plateDistance, dielectric]);
  const sourceStateQ = sourceMode ? changedCapacitance * 12 : isolatedCharge;
  const sourceStateU = changedCapacitance > 0 ? sourceStateQ / changedCapacitance : 0;
  const equivalentC = topology === "series" ? circuitC1 * circuitC2 / (circuitC1 + circuitC2) : circuitC1 + circuitC2;
  const energyRows = useMemo(() => Array.from({ length: 6 }, (_, index) => {
    const U = energyVoltage * index / 5;
    const Q = energyCapacitance * U;
    const W = 0.5 * energyCapacitance * U * U / 1000;
    return { U, Q, W };
  }), [energyCapacitance, energyVoltage]);

  const buildEvidence = (): LabEvidence => ({
    kind: "virtual-lab",
    stations: {
      "charge-discharge": { notes: notes["charge-discharge"], events: stationData["charge-discharge"].events || [], charge, initialCharge, sourceConnected, loadConnected, capacitance },
      "charge-voltage": { notes: notes["charge-voltage"], measurements, fittedCapacitance: measurementsFit, theoreticalCapacitance: capacitance, plateArea, plateDistance, dielectric },
      "capacitance-factors": { notes: notes["capacitance-factors"], selectedFactor: factorName, comparisons: factorRows, plateArea, plateDistance, dielectric },
      "source-state": { notes: notes["source-state"], sourceConnected: sourceMode, capacitance: changedCapacitance, charge: sourceStateQ, voltage: sourceStateU, isolatedCharge },
      "circuit-builder": { notes: notes["circuit-builder"], topology, capacitance1: circuitC1, capacitance2: circuitC2, sourceVoltage: circuitVoltage, equivalentCapacitance: equivalentC },
      "energy-graph": { notes: notes["energy-graph"], capacitanceMicrofarad: energyCapacitance, voltageMax: energyVoltage, measurements: energyRows, slopeVoltPerMicrocoulomb: energyCapacitance > 0 ? 1 / energyCapacitance : null },
    },
  });
  const allNotesComplete = STATIONS.every(({ id }) => Object.values(notes[id]).every((value) => value.trim().length >= 3));
  const canComplete = allNotesComplete && measurements.length >= 5 && ((stationData["charge-discharge"].events as string[] | undefined)?.length ?? 0) >= 3;

  const saveEvidence = async (complete: boolean) => {
    if (previewMode) { setMessage("Đây là bản xem trước; đăng nhập học sinh để lưu dữ liệu thật."); return; }
    if (readOnly) { setMessage("Sổ tay đã nộp và đang chờ giáo viên xem."); return; }
    if (complete && !canComplete) { setError("Hãy hoàn thành ghi chép ở cả sáu thí nghiệm và thu ít nhất năm phép đo Q–U trước khi nộp."); return; }
    setSaving(true); setError(""); setMessage("");
    try {
      const response = await fetch("/api/activity-evidence", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ activityId, evidence: buildEvidence(), complete }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Không lưu được sổ tay.");
      if (result.record?.evidence?.stations) {
        setStationData((current) => ({ ...current, "charge-discharge": { ...current["charge-discharge"], ...(result.record.evidence.stations["charge-discharge"] || {}) } }));
      }
      setMessage(complete ? "Đã nộp sổ tay cho giáo viên." : "Đã lưu sổ tay lên hệ thống.");
      if (complete) setReadOnly(true);
    } catch (saveError) { setError(saveError instanceof Error ? saveError.message : "Không lưu được sổ tay."); }
    finally { setSaving(false); }
  };

  const downloadNotebook = () => {
    const blob = new Blob([JSON.stringify(buildEvidence(), null, 2)], { type: "application/json;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url; anchor.download = `so-tay-tu-dien-hoat-dong-${activityId}.json`; anchor.click();
    URL.revokeObjectURL(url);
  };

  const setFactorInput = (value: number) => {
    if (factorName === "area") setPlateArea(value);
    else if (factorName === "distance") setPlateDistance(value);
    else setDielectric(value);
  };

  const selected = STATIONS.find(({ id }) => id === activeStation)!;
  const notesLabels: Array<{ key: keyof Notes; label: string; placeholder: string }> = [
    { key: "prediction", label: "Dự đoán trước khi thử", placeholder: "Em dự đoán đại lượng nào sẽ đổi? Vì sao?" },
    { key: "evidence", label: "Bằng chứng quan sát / số liệu", placeholder: "Ghi lại thao tác, số đo hoặc xu hướng em quan sát được." },
    { key: "conclusion", label: "Kết luận và điều chỉnh", placeholder: "Kết quả có phù hợp dự đoán không? Hãy giải thích bằng bằng chứng." },
  ];

  return (
    <section className="space-y-5 rounded-3xl border border-slate-200 bg-white p-4 shadow-xl md:p-6" aria-label="Phòng thí nghiệm ảo tụ điện">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div><p className="text-xs font-bold uppercase tracking-[.16em] text-blue-700">Sổ tay điều tra · 6 thí nghiệm</p><h2 className="mt-1 text-2xl font-black text-slate-900">Phòng thí nghiệm ảo tụ điện</h2><p className="mt-1 max-w-3xl text-sm leading-6 text-slate-600">Đặt dự đoán trước, thao tác mô hình, lưu bằng chứng và giải thích kết quả. Mô phỏng dùng công thức tụ phẳng lý tưởng, có nêu rõ giả thiết.</p></div>
        <button type="button" onClick={downloadNotebook} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"><Download className="h-4 w-4" />Tải sổ tay JSON</button>
      </header>

      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
        {STATIONS.map((station) => <button key={station.id} type="button" onClick={() => { setActiveStation(station.id); setError(""); setMessage(""); }} className={`rounded-xl border p-3 text-left text-sm font-bold transition ${activeStation === station.id ? "border-blue-600 bg-blue-50 text-blue-900" : "border-slate-200 bg-white text-slate-700 hover:border-blue-300"}`}><span className="block">{station.title}</span><span className="mt-1 block text-xs font-normal text-slate-500">{station.question}</span></button>)}
      </div>

      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 md:p-5">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-2"><div><h3 className="text-lg font-extrabold text-slate-900">{selected.title}</h3><p className="mt-1 text-sm text-slate-600">{selected.question}</p></div><span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-slate-600">{loadState === "loading" ? "Đang tải…" : previewMode ? "Bản xem thử · không lưu" : readOnly ? "Đã nộp · chỉ xem" : "Có thể lưu tiến độ"}</span></div>

        {activeStation === "charge-discharge" && <div className="space-y-4 rounded-xl bg-white p-4">
          <div className="flex flex-wrap gap-2"><button type="button" disabled={readOnly || sourceConnected} onClick={chargeCapacitor} className="inline-flex items-center gap-2 rounded-lg bg-blue-700 px-3 py-2 text-sm font-bold text-white disabled:opacity-50"><Play className="h-4 w-4"/>Nạp tụ bằng nguồn 5 V</button><button type="button" disabled={readOnly || !sourceConnected} onClick={disconnectSource} className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm font-bold text-slate-700 disabled:opacity-50"><Unplug className="h-4 w-4"/>Ngắt nguồn</button><button type="button" disabled={readOnly || sourceConnected || charge <= 0 || loadConnected} onClick={connectLoad} className="inline-flex items-center gap-2 rounded-lg bg-amber-500 px-3 py-2 text-sm font-bold text-white disabled:opacity-50"><Lightbulb className="h-4 w-4"/>Nối tải LED + điện trở</button></div>
          <div className="grid gap-4 md:grid-cols-3"><div className="rounded-xl border p-3"><span className="text-xs text-slate-500">Trạng thái</span><p className="mt-1 font-bold">{sourceConnected ? "Đang nối nguồn" : loadConnected ? "Đang phóng qua tải" : charge > 0 ? "Đã ngắt nguồn · còn điện tích" : "Tụ chưa nạp"}</p></div><div className="rounded-xl border p-3"><span className="text-xs text-slate-500">Điện tích Q</span><p className="mt-1 font-mono font-bold">{charge.toExponential(3)} C</p></div><div className="rounded-xl border p-3"><span className="text-xs text-slate-500">LED mô phỏng</span><div className="mt-2 flex items-center gap-3"><span className="h-8 w-8 rounded-full border" style={{ backgroundColor: loadConnected && charge > 0 ? "#fde047" : "#cbd5e1", boxShadow: loadConnected && charge > 0 ? "0 0 22px #facc15" : "none", opacity: initialCharge > 0 ? Math.max(.2, charge / initialCharge) : .35 }} /><span className="text-xs text-slate-600">{loadConnected && charge > 0 ? "Sáng rồi mờ dần" : "Tắt"}</span></div></div></div>
          <p className="text-xs leading-5 text-slate-500">Mô hình định tính; thời gian phóng không đại diện linh kiện thật. Luôn dùng điện áp thấp, tụ đúng định mức và điện trở hạn dòng trong thí nghiệm thật.</p>
        </div>}

        {activeStation === "charge-voltage" && <div className="space-y-4 rounded-xl bg-white p-4">
          <div className="grid gap-3 sm:grid-cols-3"><label className="text-xs font-semibold text-slate-600">Diện tích S (m²)<input type="number" min="0.0001" step="0.001" value={plateArea} disabled={readOnly} onChange={(event) => setPlateArea(Math.max(0.0001, Number(event.target.value)))} className="mt-1 w-full rounded-lg border p-2 text-sm"/></label><label className="text-xs font-semibold text-slate-600">Khoảng cách d (m)<input type="number" min="0.0001" step="0.0001" value={plateDistance} disabled={readOnly} onChange={(event) => setPlateDistance(Math.max(0.0001, Number(event.target.value)))} className="mt-1 w-full rounded-lg border p-2 text-sm"/></label><label className="text-xs font-semibold text-slate-600">Hằng số điện môi εr<input type="number" min="1" step="0.1" value={dielectric} disabled={readOnly} onChange={(event) => setDielectric(Math.max(1, Number(event.target.value)))} className="mt-1 w-full rounded-lg border p-2 text-sm"/></label></div>
          <div className="flex flex-wrap items-center gap-2"><button type="button" disabled={readOnly || measurements.length >= 10} onClick={takeMeasurement} className="rounded-lg bg-blue-700 px-3 py-2 text-sm font-bold text-white disabled:opacity-50">Lấy phép đo tiếp theo ({measurements.length}/10)</button><button type="button" disabled={readOnly || measurements.length === 0} onClick={clearMeasurements} className="rounded-lg border px-3 py-2 text-sm font-bold text-slate-700 disabled:opacity-50">Xóa phép đo</button><span className="text-sm font-bold text-blue-800">C lý thuyết = {capacitance.toExponential(3)} F</span></div>
          <div className="h-64"><ResponsiveContainer width="100%" height="100%"><LineChart data={measurements}><CartesianGrid strokeDasharray="3 3"/><XAxis dataKey="U" name="U" unit=" V"/><YAxis dataKey="Q" name="Q" unit=" C"/><Tooltip formatter={(value) => Number(value).toExponential(3)}/><Line type="monotone" dataKey="Q" stroke="#2563eb" strokeWidth={2} dot/></LineChart></ResponsiveContainer></div>
          <p className="text-sm text-slate-700">Hồi quy qua gốc: <b>C ≈ Σ(UQ)/Σ(U²) = {measurementsFit ? measurementsFit.toExponential(3) : "chưa đủ phép đo"} F</b>. Q được sinh từ Q=CU với nhiễu đo nhỏ; không tạo Q độc lập với U.</p>
        </div>}

        {activeStation === "capacitance-factors" && <div className="space-y-4 rounded-xl bg-white p-4">
          <div className="grid gap-3 sm:grid-cols-[1fr_2fr]"><label className="text-xs font-semibold text-slate-600">Yếu tố thay đổi<select value={factorName} disabled={readOnly} onChange={(event) => setFactorName(event.target.value as typeof factorName)} className="mt-1 w-full rounded-lg border p-2 text-sm"><option value="area">Diện tích bản S</option><option value="distance">Khoảng cách d</option><option value="dielectric">Điện môi εr</option></select></label><label className="text-xs font-semibold text-slate-600">Giá trị cơ sở của yếu tố đang chọn<input type="number" min="0.0001" step="0.1" value={factorName === "area" ? plateArea : factorName === "distance" ? plateDistance : dielectric} disabled={readOnly} onChange={(event) => setFactorInput(Math.max(0.0001, Number(event.target.value)))} className="mt-1 w-full rounded-lg border p-2 text-sm"/></label></div>
          <p className="text-xs text-slate-500">Mỗi lần chỉ thay đổi một yếu tố; hai yếu tố còn lại được giữ cố định.</p><div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b text-left text-slate-500"><th className="p-2">Giá trị yếu tố</th><th className="p-2">C tính theo ε₀εrS/d</th><th className="p-2">So với mức cơ sở</th></tr></thead><tbody>{factorRows.map((row,index)=><tr key={index} className="border-b"><td className="p-2">{row.value.toPrecision(4)}</td><td className="p-2 font-mono">{row.capacitance.toExponential(3)} F</td><td className="p-2">{row.capacitance > capacitance ? "Tăng" : row.capacitance < capacitance ? "Giảm" : "Cơ sở"}</td></tr>)}</tbody></table></div>
        </div>}

        {activeStation === "source-state" && <div className="space-y-4 rounded-xl bg-white p-4">
          <div className="flex flex-wrap gap-2"><button type="button" disabled={readOnly || sourceMode} onClick={() => { setIsolatedCharge(changedCapacitance * 12); setSourceMode(true); updateStationData("source-state", { event: "Nối lại nguồn 12 V" }); }} className={`rounded-lg px-3 py-2 text-sm font-bold ${sourceMode ? "bg-blue-700 text-white" : "border text-slate-700"}`}>Đang nối nguồn</button><button type="button" disabled={readOnly || !sourceMode} onClick={() => { setIsolatedCharge(changedCapacitance * 12); setSourceMode(false); updateStationData("source-state", { event: "Ngắt nguồn; giữ Q" }); }} className={`rounded-lg px-3 py-2 text-sm font-bold ${!sourceMode ? "bg-blue-700 text-white" : "border text-slate-700"}`}>Ngắt nguồn và cô lập</button></div>
          <label className="block max-w-sm text-xs font-semibold text-slate-600">Điều chỉnh khoảng cách d để đổi C<input type="number" min="0.0001" step="0.0001" value={plateDistance} disabled={readOnly} onChange={(event) => setPlateDistance(Math.max(0.0001, Number(event.target.value)))} className="mt-1 w-full rounded-lg border p-2 text-sm"/></label>
          <div className="grid gap-3 sm:grid-cols-3">{[["Trạng thái nguồn",sourceMode ? "Nối · U giữ ở 12 V" : "Ngắt · Q được giữ"],["Điện dung C",`${changedCapacitance.toExponential(3)} F`],["Điện tích Q",`${sourceStateQ.toExponential(3)} C`],["Hiệu điện thế U",`${sourceStateU.toFixed(3)} V`]].map(([label,value])=><div key={label} className="rounded-xl border p-3"><span className="text-xs text-slate-500">{label}</span><p className="mt-1 font-bold">{value}</p></div>)}</div><p className="text-xs leading-5 text-slate-600">Khi nối nguồn, U không đổi và Q thay đổi theo C. Khi ngắt nguồn, Q giữ nguyên trong mô hình cô lập; U=Q/C thay đổi.</p>
        </div>}

        {activeStation === "circuit-builder" && <div className="space-y-4 rounded-xl bg-white p-4">
          <div className="grid gap-3 sm:grid-cols-4"><label className="text-xs font-semibold text-slate-600">C₁ (μF)<input type="number" min="0.1" step="0.1" value={circuitC1} disabled={readOnly} onChange={(event) => setCircuitC1(Math.max(0.1, Number(event.target.value)))} className="mt-1 w-full rounded-lg border p-2 text-sm"/></label><label className="text-xs font-semibold text-slate-600">C₂ (μF)<input type="number" min="0.1" step="0.1" value={circuitC2} disabled={readOnly} onChange={(event) => setCircuitC2(Math.max(0.1, Number(event.target.value)))} className="mt-1 w-full rounded-lg border p-2 text-sm"/></label><label className="text-xs font-semibold text-slate-600">Nguồn U (V)<input type="number" min="0.1" step="0.5" value={circuitVoltage} disabled={readOnly} onChange={(event) => setCircuitVoltage(Math.max(0.1, Number(event.target.value)))} className="mt-1 w-full rounded-lg border p-2 text-sm"/></label><label className="text-xs font-semibold text-slate-600">Kiểu ghép<select value={topology} disabled={readOnly} onChange={(event) => setTopology(event.target.value as typeof topology)} className="mt-1 w-full rounded-lg border p-2 text-sm"><option value="series">Nối tiếp</option><option value="parallel">Song song</option></select></label></div>
          <div className="grid gap-3 sm:grid-cols-3"><div className="rounded-xl border p-3"><span className="text-xs text-slate-500">C tương đương</span><p className="mt-1 font-bold">{equivalentC.toFixed(3)} μF</p></div><div className="rounded-xl border p-3"><span className="text-xs text-slate-500">Điện tích tổng</span><p className="mt-1 font-bold">{(equivalentC*circuitVoltage).toFixed(3)} μC</p></div><div className="rounded-xl border p-3"><span className="text-xs text-slate-500">Quy tắc</span><p className="mt-1 font-bold">{topology === "series" ? "Q₁=Q₂; U=U₁+U₂" : "U₁=U₂; Q=Q₁+Q₂"}</p></div></div>
          <p className="text-sm text-slate-700">{topology === "series" ? `U₁=${(equivalentC*circuitVoltage/circuitC1).toFixed(3)} V; U₂=${(equivalentC*circuitVoltage/circuitC2).toFixed(3)} V; C tương đương nhỏ hơn từng tụ.` : `Q₁=${(circuitC1*circuitVoltage).toFixed(3)} μC; Q₂=${(circuitC2*circuitVoltage).toFixed(3)} μC; C tương đương bằng tổng hai tụ.`}</p>
        </div>}

        {activeStation === "energy-graph" && <div className="space-y-4 rounded-xl bg-white p-4">
          <div className="grid gap-3 sm:grid-cols-2"><label className="text-xs font-semibold text-slate-600">Điện dung C (μF)<input type="number" min="0.1" step="0.1" value={energyCapacitance} disabled={readOnly} onChange={(event) => setEnergyCapacitance(Math.max(0.1, Number(event.target.value)))} className="mt-1 w-full rounded-lg border p-2 text-sm"/></label><label className="text-xs font-semibold text-slate-600">U cực đại (V)<input type="number" min="1" step="1" value={energyVoltage} disabled={readOnly} onChange={(event) => setEnergyVoltage(Math.max(1, Number(event.target.value)))} className="mt-1 w-full rounded-lg border p-2 text-sm"/></label></div>
          <div className="h-64"><ResponsiveContainer width="100%" height="100%"><LineChart data={energyRows}><CartesianGrid strokeDasharray="3 3"/><XAxis dataKey="Q" name="Q" unit=" μC"/><YAxis dataKey="U" name="U" unit=" V"/><Tooltip formatter={(value) => Number(value).toFixed(3)}/><Line type="linear" dataKey="U" stroke="#7c3aed" strokeWidth={2} dot/></LineChart></ResponsiveContainer></div>
          <div className="grid gap-3 sm:grid-cols-2"><p className="rounded-xl bg-violet-50 p-3 text-sm">Độ dốc U=f(Q): <b>1/C ≈ {(1/energyCapacitance).toFixed(4)} V/μC</b>.</p><p className="rounded-xl bg-violet-50 p-3 text-sm">Năng lượng tại U max: <b>W = ½CU² ≈ {energyRows.at(-1)?.W.toPrecision(4)} mJ</b>; cũng bằng diện tích tam giác dưới đường U=f(Q).</p></div>
        </div>}
      </div>

      <div className="grid gap-3 md:grid-cols-3">{notesLabels.map(({ key, label, placeholder }) => <label key={key} className="text-xs font-bold text-slate-700">{label}<textarea value={notes[activeStation][key]} disabled={readOnly} onChange={(event) => changeNote(key, event.target.value)} maxLength={2000} placeholder={placeholder} className="mt-1 min-h-24 w-full rounded-xl border border-slate-200 bg-white p-3 text-sm font-normal leading-6 outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100"/></label>)}</div>

      {previewMode && <p className="flex items-center gap-2 rounded-xl bg-amber-50 p-3 text-xs text-amber-900"><AlertCircle className="h-4 w-4 shrink-0"/>Chế độ xem tự do đang dùng dữ liệu trên thiết bị; cần tài khoản học sinh để lưu sổ tay lên lớp học.</p>}
      {loadState === "unavailable" && <p role="alert" className="rounded-xl bg-rose-50 p-3 text-xs text-rose-800">{error || "Dịch vụ hồ sơ chưa sẵn sàng."}</p>}
      {error && loadState !== "unavailable" && <p role="alert" className="rounded-xl bg-rose-50 p-3 text-xs text-rose-800">{error}</p>}
      {message && <p role="status" className="rounded-xl bg-emerald-50 p-3 text-xs text-emerald-800">{message}</p>}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4"><p className="text-xs text-slate-500">{measurements.length}/5 phép đo tối thiểu · {STATIONS.filter(({id})=>Object.values(notes[id]).every((value)=>value.trim().length>=3)).length}/6 chặng có đủ ghi chép</p><div className="flex gap-2"><button type="button" disabled={saving || readOnly || previewMode} onClick={() => void saveEvidence(false)} className="inline-flex items-center gap-2 rounded-xl border border-blue-200 px-4 py-2.5 text-sm font-bold text-blue-800 disabled:opacity-50">{saving?<Loader2 className="h-4 w-4 animate-spin"/>:<Save className="h-4 w-4"/>}Lưu tiến độ</button><button type="button" disabled={saving || readOnly || previewMode || !canComplete} onClick={() => void saveEvidence(true)} className="inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50">{saving?<Loader2 className="h-4 w-4 animate-spin"/>:<CheckCircle2 className="h-4 w-4"/>}Nộp sổ tay cho giáo viên</button></div></div>
      <p className="text-xs text-slate-500">{error && !canComplete ? "Hoàn tất đủ ghi chép trước khi nộp." : "Số đo Q–U được tạo từ Q=CU với nhiễu thiết bị tối đa 0,5%; kết quả mô phỏng không thay thế thiết bị đo thực."}</p>
    </section>
  );
}
