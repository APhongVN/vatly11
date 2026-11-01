const MAX_EXTERNAL_LINK_LENGTH = 2_000;

/**
 * A submission can reference either the student's own private upload or an
 * ordinary http(s) document link.  This prevents `javascript:`/data URLs and
 * prevents one student from attaching another student's private object path.
 */
export function normalizeSubmissionFileUrl(value: unknown, userId: string, folder: "submissions" | "group-submissions" = "submissions"): string | null {
  if (typeof value !== "string" || !value.trim()) return null;
  const candidate = value.trim();
  if (candidate.length > MAX_EXTERNAL_LINK_LENGTH) return null;

  const privateUpload = new RegExp(`^${folder}/${escapeRegExp(userId)}/[A-Za-z0-9._ -]{1,255}$`);
  if (privateUpload.test(candidate)) return candidate;

  try {
    const url = new URL(candidate);
    if ((url.protocol !== "https:" && url.protocol !== "http:") || url.username || url.password) return null;
    return url.toString();
  } catch {
    return null;
  }
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
