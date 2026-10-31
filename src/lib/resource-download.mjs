export function getResourceDownloadName(storagePath, title) {
  const pathName = String(storagePath ?? "").split("/").pop() ?? "";
  let fileName = pathName;
  try { fileName = decodeURIComponent(pathName); } catch { /* Keep the original safe path segment. */ }
  fileName = fileName.replace(/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}-/i, "");
  const safeTitle = String(title ?? "").replace(/[\\/:*?"<>|]/g, "_").trim();
  return fileName && !fileName.includes("..") ? fileName : safeTitle || "tai-lieu";
}
