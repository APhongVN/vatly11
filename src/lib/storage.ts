"use client";
const KEY = "tu-dien-progress";
export function getCompleted(): number[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}
export function markActivityComplete(id: number) {
  if (typeof window === "undefined") return;
  const done = getCompleted();
  if (!done.includes(id)) {
    localStorage.setItem(KEY, JSON.stringify([...done, id]));
  }
}
export function getCompletedCount(): number {
  return getCompleted().length;
}
export function resetProgress() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(KEY);
}