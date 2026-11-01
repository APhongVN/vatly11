"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Loader2, Save, SlidersHorizontal } from "lucide-react";
import {
  DEFAULT_CAPACITANCE_LAB_SETTINGS,
  isValidCapacitanceLabSettings,
} from "@/lib/capacitance-lab-settings.mjs";

type Settings = typeof DEFAULT_CAPACITANCE_LAB_SETTINGS;
type NumericKey = keyof Settings;
const FIELDS: Array<{ key: NumericKey; label: string; unit: string; min: number; max: number; step: number }> = [
  { key: "maxVoltage", label: "Điện áp nguồn tối đa", unit: "V", min: 1, max: 60, step: 0.5 },
  { key: "plateAreaMinCm2", label: "Diện tích bản nhỏ nhất", unit: "cm²", min: 1, max: 10000, step: 1 },
  { key: "plateAreaMaxCm2", label: "Diện tích bản lớn nhất", unit: "cm²", min: 1, max: 10000, step: 1 },
  { key: "plateDistanceMinMm", label: "Khoảng cách nhỏ nhất", unit: "mm", min: 0.1, max: 1000, step: 0.1 },
  { key: "plateDistanceMaxMm", label: "Khoảng cách lớn nhất", unit: "mm", min: 0.1, max: 1000, step: 0.1 },
  { key: "dielectricMin", label: "εr nhỏ nhất", unit: "", min: 1, max: 1000, step: 0.1 },
  { key: "dielectricMax", label: "εr lớn nhất", unit: "", min: 1, max: 1000, step: 0.1 },
  { key: "dielectricDefault", label: "εr mặc định", unit: "", min: 1, max: 1000, step: 0.1 },
];

export default function CapacitanceLabSettings({ previewMode = false }: { previewMode?: boolean }) {
  const [settings, setSettings] = useState<Settings>({ ...DEFAULT_CAPACITANCE_LAB_SETTINGS });
  const [storageReady, setStorageReady] = useState(false);
  const [loading, setLoading] = useState(!previewMode);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (previewMode) { setLoading(false); return; }
    let cancelled = false;
    fetch("/api/capacitance-lab-settings", { cache: "no-store" })
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "Không tải được cấu hình.");
        if (!cancelled && result.settings && isValidCapacitanceLabSettings(result.settings)) {
          setSettings(result.settings);
          setStorageReady(result.storageReady === true);
        }
      })
      .catch((loadError: unknown) => { if (!cancelled) setError(loadError instanceof Error ? loadError.message : "Không tải được cấu hình."); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [previewMode]);

  const update = (key: NumericKey, value: number) => {
    setSettings((current) => ({ ...current, [key]: value }));
    setMessage("");
  };

  const save = async () => {
    if (!isValidCapacitanceLabSettings(settings)) { setError("Miền giá trị chưa hợp lệ: giá trị lớn phải lớn hơn giá trị nhỏ, εr mặc định phải nằm trong miền εr."); return; }
    setSaving(true); setError(""); setMessage("");
    if (previewMode) {
      window.setTimeout(() => {
        setStorageReady(true);
        setMessage("Đã lưu thử cấu hình trong phiên xem trước. Dữ liệu lớp thật không bị thay đổi.");
        setSaving(false);
      }, 250);
      return;
    }
    try {
      const response = await fetch("/api/capacitance-lab-settings", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ settings }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Không lưu được cấu hình.");
      setSettings(result.settings);
      setStorageReady(true);
      setMessage("Đã lưu cấu hình. Miền thí nghiệm sẽ khóa sau khi có hồ sơ học sinh để giữ nhất quán dữ liệu.");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Không lưu được cấu hình.");
    } finally { setSaving(false); }
  };

  return <section className="space-y-4 rounded-2xl border border-cyan-200 bg-gradient-to-br from-cyan-50 to-white p-5">
    <header className="flex items-start gap-3"><SlidersHorizontal className="mt-1 h-5 w-5 text-cyan-800"/><div><h3 className="text-lg font-extrabold text-slate-950">Cấu hình phòng thí nghiệm tụ điện</h3><p className="mt-1 text-sm leading-6 text-slate-600">Thiết lập miền U, S, d và εr trước khi giao bài. Cấu hình được dùng chung cho hai phòng thí nghiệm và bị khóa khi lớp đã có hồ sơ đo.</p></div></header>
    {previewMode && <p className="rounded-xl bg-amber-50 p-3 text-xs text-amber-900">Bản xem trước: có thể chỉnh thông số và bấm Lưu để thử kiểm tra miền giá trị. Không có cấu hình lớp thật nào bị thay đổi.</p>}
    {!previewMode && !storageReady && !loading && <p role="status" className="rounded-xl bg-amber-50 p-3 text-xs text-amber-950">Chưa tải được cấu hình đã lưu. Hãy áp dụng migration 20261031002300 trên Supabase trước khi giao thí nghiệm.</p>}
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{FIELDS.map((field) => <label key={field.key} className="text-xs font-bold text-slate-700">{field.label}<div className="mt-1 flex items-center gap-2"><input type="number" min={field.min} max={field.max} step={field.step} value={settings[field.key]} disabled={loading || saving} onChange={(event) => update(field.key, event.currentTarget.valueAsNumber)} className="w-full rounded-lg border border-slate-200 bg-white p-2.5 text-sm font-semibold disabled:bg-slate-100"/><span className="min-w-8 text-slate-500">{field.unit}</span></div></label>)}</div>
    <p className="text-xs leading-5 text-slate-500">Mặc định theo tài liệu: U≤12 V, S=100–600 cm², d=1–10 mm; εr mặc định 2 và có thể điều chỉnh trong miền do giáo viên đặt.</p>
    {error && <p role="alert" className="rounded-xl bg-rose-50 p-3 text-sm text-rose-800">{error}</p>}
    {message && <p role="status" className="flex items-center gap-2 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-900"><CheckCircle2 className="h-4 w-4 shrink-0"/>{message}</p>}
    <button type="button" onClick={() => void save()} disabled={loading || saving} className="inline-flex items-center gap-2 rounded-xl bg-cyan-800 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50">{saving ? <Loader2 className="h-4 w-4 animate-spin"/> : <Save className="h-4 w-4"/>}{loading ? "Đang tải cấu hình…" : saving ? "Đang lưu…" : "Lưu cấu hình thí nghiệm"}</button>
  </section>;
}
