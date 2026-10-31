export const DELAYED_PRACTICE_DELAY_MS = 7 * 24 * 60 * 60 * 1000;

export function getDelayedPracticeWindow(completedAt, now = Date.now()) {
  if (typeof completedAt !== "string") return { availableAt: null, available: false };
  const completedTime = Date.parse(completedAt);
  if (!Number.isFinite(completedTime)) return { availableAt: null, available: false };
  const unlockTime = completedTime + DELAYED_PRACTICE_DELAY_MS;
  return { availableAt: new Date(unlockTime).toISOString(), available: now >= unlockTime };
}