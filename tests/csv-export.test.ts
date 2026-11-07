import { describe, expect, it } from "vitest";
import { csvSafeCell } from "../src/lib/csv-export.mjs";

describe("csvSafeCell", () => {
  it("wraps plain values in double quotes", () => {
    expect(csvSafeCell("abc")).toBe('"abc"');
  });

  it("escapes embedded double quotes", () => {
    expect(csvSafeCell('He said "hi"')).toBe('"He said ""hi"""');
  });

  it("neutralizes formula injection characters with a leading apostrophe", () => {
    for (const value of ["=SUM(A1)", "+1", "-1", "@SUM(A1)", "\thi", "\r\nline"]) {
      const cell = csvSafeCell(value);
      expect(cell.startsWith('"')).toBe(true);
      expect(cell).toContain("'" + value);
    }
  });

  it("coerces null/undefined to an empty quoted cell", () => {
    expect(csvSafeCell(null)).toBe('""');
    expect(csvSafeCell(undefined)).toBe('""');
  });

  it("stringifies numbers", () => {
    expect(csvSafeCell(42)).toBe('"42"');
  });
});
