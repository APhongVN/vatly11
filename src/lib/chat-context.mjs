export function getChatActivityId(pathname, search = "") {
  if (typeof pathname !== "string") return null;
  const lesson = pathname.match(/^\/hoat-dong\/(\d{1,2})\/?$/);
  const quiz = pathname === "/lam-bai" ? new URLSearchParams(search).get("activityId") : null;
  const value = lesson?.[1] || quiz;
  if (!value || !/^\d{1,2}$/.test(value)) return null;
  const id = Number(value);
  return Number.isInteger(id) && id >= 1 && id <= 14 ? id : null;
}

export function isStudentTaskAwaitingWork(activity, completedAt, now = Date.now()) {
  if (!activity || activity.status !== "available" || activity.accepting_submissions !== true) return false;
  if (completedAt) return false;
  if (activity.deadline) {
    const deadline = Date.parse(activity.deadline);
    if (!Number.isFinite(deadline) || deadline < now) return false;
  }
  return true;
}