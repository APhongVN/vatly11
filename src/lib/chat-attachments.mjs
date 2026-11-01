export const MAX_CHAT_ATTACHMENT_BYTES = 25 * 1024 * 1024;
export const CHAT_ATTACHMENT_ACCEPT = [
  ".pdf", ".doc", ".docx", ".xls", ".xlsx", ".ppt", ".pptx", ".odt", ".ods", ".odp", ".rtf", ".pages", ".numbers", ".key",
  ".jpg", ".jpeg", ".png", ".webp", ".gif", ".avif", ".bmp", ".heic", ".heif", ".tif", ".tiff",
  ".mp3", ".m4a", ".aac", ".wav", ".ogg", ".mp4", ".webm", ".mov",
  ".txt", ".md", ".csv", ".json", ".xml", ".zip", ".rar", ".7z",
].join(",");

const MIME_BY_EXTENSION = Object.freeze({
  pdf: "application/pdf",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xls: "application/vnd.ms-excel",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ppt: "application/vnd.ms-powerpoint",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  odt: "application/vnd.oasis.opendocument.text",
  ods: "application/vnd.oasis.opendocument.spreadsheet",
  odp: "application/vnd.oasis.opendocument.presentation",
  rtf: "application/rtf",
  pages: "application/vnd.apple.pages",
  numbers: "application/vnd.apple.numbers",
  key: "application/vnd.apple.keynote",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
  avif: "image/avif",
  bmp: "image/bmp",
  heic: "image/heic",
  heif: "image/heif",
  tif: "image/tiff",
  tiff: "image/tiff",
  mp3: "audio/mpeg",
  m4a: "audio/mp4",
  aac: "audio/aac",
  wav: "audio/wav",
  ogg: "audio/ogg",
  mp4: "video/mp4",
  webm: "video/webm",
  mov: "video/quicktime",
  txt: "text/plain",
  md: "text/markdown",
  csv: "text/csv",
  json: "application/json",
  xml: "application/xml",
  zip: "application/zip",
  rar: "application/vnd.rar",
  "7z": "application/x-7z-compressed",
});

export function chatAttachmentMimeType(file) {
  const declaredType = typeof file?.type === "string" ? file.type.trim().toLowerCase() : "";
  if (declaredType && declaredType !== "application/octet-stream") return declaredType;
  const extension = typeof file?.name === "string" ? file.name.split(".").pop()?.toLowerCase() : "";
  return MIME_BY_EXTENSION[extension] || declaredType || "application/octet-stream";
}
// HEIC/HEIF/TIFF remain downloadable; browsers do not render them consistently.
const INLINE_IMAGE_TYPES = new Set(["image/avif", "image/bmp", "image/gif", "image/jpeg", "image/png", "image/webp"]);

export function isInlineChatImage(mimeType) {
  return typeof mimeType === "string" && INLINE_IMAGE_TYPES.has(mimeType.trim().toLowerCase());
}
