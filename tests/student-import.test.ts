import { describe, expect, it } from "vitest";
import { sanitizePersonName, containsDigit, hasInvalidNameCharacters, formatVietnameseName } from "../src/lib/vietnameseName";
import { extractStudentRowsFromText } from "../src/lib/student-import.mjs";

describe("sanitizePersonName", () => {
  it("in hoa đúng chuẩn tiếng Việt và bỏ chữ số + ký tự đặc biệt", () => {
    expect(sanitizePersonName("nguyễn văn a1!")).toBe("Nguyễn Văn A");
    expect(sanitizePersonName("  trần  thị   b  ")).toBe("Trần Thị B");
    expect(sanitizePersonName("lê hoài bảo@#")).toBe("Lê Hoài Bảo");
    expect(sanitizePersonName("")).toBe("");
  });
});

describe("containsDigit", () => {
  it("phát hiện chữ số", () => {
    expect(containsDigit("nguyễn 1")).toBe(true);
    expect(containsDigit("nguyễn văn a")).toBe(false);
  });
});

describe("hasInvalidNameCharacters", () => {
  it("chặn số và ký tự đặc biệt, cho phép dấu và gạch nối", () => {
    expect(hasInvalidNameCharacters("Nguyễn Văn An")).toBe(false);
    expect(hasInvalidNameCharacters("Trần Thị B. C")).toBe(false);
    expect(hasInvalidNameCharacters("Lê Hoài Bảo123")).toBe(true);
    expect(hasInvalidNameCharacters("Nguyễn@An")).toBe(true);
  });
});

describe("extractStudentRowsFromText", () => {
  it("nhận cột họ tên và mã số sinh viên", () => {
    const text = "stt\thọ và tên\tmã số sinh viên\n1\tNguyễn Văn An\tHS001\n2\tTrần Thị B\tHS002";
    expect(extractStudentRowsFromText(text)).toEqual([
      { fullName: "Nguyễn Văn An", studentCode: "HS001" },
      { fullName: "Trần Thị B", studentCode: "HS002" },
    ]);
  });

  it("trả mã rỗng khi tệp không có cột mã", () => {
    const text = "Nguyễn Văn An\nTrần Thị B";
    expect(extractStudentRowsFromText(text)).toEqual([
      { fullName: "Nguyễn Văn An", studentCode: "" },
      { fullName: "Trần Thị B", studentCode: "" },
    ]);
  });

  it("nhận cột tách họ / tên đệm / tên", () => {
    const text = "họ\ttên đệm\ttên\tmssv\nNguyễn\tVăn\tAn\tSV9\nTrần\tThị\tB\tSV8";
    expect(extractStudentRowsFromText(text)).toEqual([
      { fullName: "Nguyễn Văn An", studentCode: "SV9" },
      { fullName: "Trần Thị B", studentCode: "SV8" },
    ]);
  });
});