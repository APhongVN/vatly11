/**
 * Tiện ích chuẩn hóa và sắp xếp Họ Tên tiếng Việt
 */

// Viết hoa chữ cái đầu tiên của từng từ (Title Case)
export function formatVietnameseName(rawName: string): string {
  if (!rawName) return "";
  return rawName
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

// Lấy tên chính (từ cuối cùng) của họ tên
export function getFirstName(fullName: string): string {
  if (!fullName) return "";
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  return parts[parts.length - 1] || "";
}

// So sánh sắp xếp danh sách họ tên tiếng Việt theo Tên trước (A-Z theo bảng chữ cái Việt Nam)
// Ví dụ: "Đỗ Thanh Phong" lấy "Phong" (P) so sánh với "Nguyễn Văn An" lấy "An" (A)
export function sortVietnameseNames<T extends { full_name?: string } | string>(a: T, b: T): number {
  const nameA = typeof a === "string" ? a : (a.full_name || "");
  const nameB = typeof b === "string" ? b : (b.full_name || "");

  const firstA = getFirstName(nameA);
  const firstB = getFirstName(nameB);

  // So sánh Tên chính trước theo tiếng Việt
  const cmp = firstA.localeCompare(firstB, "vi", { sensitivity: "base" });
  if (cmp !== 0) return cmp;

  // Nếu cùng Tên thì so sánh toàn bộ Họ và Tên đệm
  return nameA.localeCompare(nameB, "vi", { sensitivity: "base" });
}

// Kiểm tra xem 1 chuỗi có phải là tiêu đề/cột rác không phải tên học sinh
export function isHeaderOrInvalidCell(cellText: string): boolean {
  if (!cellText || typeof cellText !== "string") return true;
  const t = cellText.trim().toLowerCase();
  if (t.length < 3) return true;
  if (/^\d+$/.test(t)) return true; // Chỉ là số

  const blackList = [
    "stt", "họ và tên", "họ tên", "họ đệm", "tên", "họ lót", "họ",
    "lớp", "năm sinh", "ngày sinh", "giới tính", "nữ", "nam", "ghi chú",
    "điểm", "toán", "vật lý", "vật lí", "email", "sđt", "số điện thoại",
    "thứ tự", "danh sách", "học sinh", "sinh viên", "mã học sinh", "mã hs"
  ];

  return blackList.some((b) => t === b || t.startsWith(b + " ") || t.endsWith(" " + b));
}
