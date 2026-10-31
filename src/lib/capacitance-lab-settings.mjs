export const DEFAULT_CAPACITANCE_LAB_SETTINGS = {
  maxVoltage: 12,
  plateAreaMinCm2: 100,
  plateAreaMaxCm2: 600,
  plateDistanceMinMm: 1,
  plateDistanceMaxMm: 10,
  dielectricMin: 1,
  dielectricMax: 10,
  dielectricDefault: 2,
};

export function isValidCapacitanceLabSettings(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const fields = Object.keys(DEFAULT_CAPACITANCE_LAB_SETTINGS);
  if (fields.some((field) => !Number.isFinite(value[field]))) return false;
  const settings = value;
  return Number.isFinite(settings.maxVoltage) && settings.maxVoltage >= 1 && settings.maxVoltage <= 60
    && Number.isFinite(settings.plateAreaMinCm2) && settings.plateAreaMinCm2 >= 1 && settings.plateAreaMinCm2 <= 10000
    && Number.isFinite(settings.plateAreaMaxCm2) && settings.plateAreaMaxCm2 > settings.plateAreaMinCm2 && settings.plateAreaMaxCm2 <= 10000
    && Number.isFinite(settings.plateDistanceMinMm) && settings.plateDistanceMinMm >= 0.1 && settings.plateDistanceMinMm <= 1000
    && Number.isFinite(settings.plateDistanceMaxMm) && settings.plateDistanceMaxMm > settings.plateDistanceMinMm && settings.plateDistanceMaxMm <= 1000
    && Number.isFinite(settings.dielectricMin) && settings.dielectricMin >= 1 && settings.dielectricMin <= 1000
    && Number.isFinite(settings.dielectricMax) && settings.dielectricMax > settings.dielectricMin && settings.dielectricMax <= 1000
    && Number.isFinite(settings.dielectricDefault) && settings.dielectricDefault >= settings.dielectricMin && settings.dielectricDefault <= settings.dielectricMax;
}

export function capacitanceLabSettingsFromDatabase(row) {
  if (!row || typeof row !== "object") return { ...DEFAULT_CAPACITANCE_LAB_SETTINGS };
  return {
    maxVoltage: Number(row.max_voltage),
    plateAreaMinCm2: Number(row.plate_area_min_cm2),
    plateAreaMaxCm2: Number(row.plate_area_max_cm2),
    plateDistanceMinMm: Number(row.plate_distance_min_mm),
    plateDistanceMaxMm: Number(row.plate_distance_max_mm),
    dielectricMin: Number(row.dielectric_min),
    dielectricMax: Number(row.dielectric_max),
    dielectricDefault: Number(row.dielectric_default),
  };
}

export function capacitanceLabSettingsToDatabase(settings, updatedBy) {
  return {
    id: 1,
    max_voltage: settings.maxVoltage,
    plate_area_min_cm2: settings.plateAreaMinCm2,
    plate_area_max_cm2: settings.plateAreaMaxCm2,
    plate_distance_min_mm: settings.plateDistanceMinMm,
    plate_distance_max_mm: settings.plateDistanceMaxMm,
    dielectric_min: settings.dielectricMin,
    dielectric_max: settings.dielectricMax,
    dielectric_default: settings.dielectricDefault,
    updated_by: updatedBy,
    updated_at: new Date().toISOString(),
  };
}
