import JSZip from "jszip";

export const MAX_ARCHIVE_EXPANDED_BYTES = 40 * 1024 * 1024;

export async function loadBoundedZip(input, label) {
  const zip = await JSZip.loadAsync(input);
  const expandedBytes = Object.values(zip.files).reduce((total, entry) => {
    if (entry.dir) return total;
    const size = entry._data?.uncompressedSize;
    if (!Number.isSafeInteger(size) || size < 0) throw new Error(`Không xác minh được kích thước nội dung ${label}.`);
    return total + size;
  }, 0);
  if (expandedBytes > MAX_ARCHIVE_EXPANDED_BYTES) {
    throw new Error(`Tài liệu ${label} sau giải nén vượt quá giới hạn 40 MB.`);
  }
  return zip;
}