const TEACHER_ONLY_LABEL = /^(?:đáp\s*án(?:\s*\/\s*(?:ý chính|tiêu chí))?(?:\s+chuẩn)?|đáp\s*số|lời\s*giải|rubric(?:\b.*)?|tiêu\s*chí\s*(?:gv|giáo viên)|trọng\s*số|thang\s*điểm|mức\s*đạt(?:\s*tốt)?|điểm\s*tối\s*đa|kết\s*quả\s*\/\s*đáp\s*án\s*gv|lỗi\/quan niệm cần gắn tag|phản hồi ai mẫu(?:\b.*)?|answer key|model answer|correct answer|expected answer)$/i;
const TEACHER_ONLY_HEADING = /^(?:\d+(?:\.\d+)*\.?\s*)?(?:rubric\b|đáp\s*án\b|đáp\s*số\b|lời\s*giải\b|thang\s*điểm\b|thư viện phản hồi ai\b)/i;
const ANSWER_COLUMN = /đáp\s*án|đáp\s*số|lời\s*giải|correct answer|answer key|model answer|expected answer|kết\s*quả\s*\/\s*đáp\s*án|đáp\s*án\s*\/\s*tiêu\s*chí/i;
const PRIVATE_COLUMN = /rubric|tiêu\s*chí\s*(?:gv|giáo viên)|trọng\s*số|thang\s*điểm|mức\s*đạt|điểm\s*tối\s*đa|lỗi\/quan niệm cần gắn tag|phản hồi ai mẫu|không nên phản hồi|phản hồi nên dùng/i;
const SCORING_HEADER = /tiêu\s*chí|trọng\s*số|mô\s*tả\s*mức\s*đạt/i;

export function isTeacherOnlyText(value) {
  const text = String(value ?? "").trim();
  return TEACHER_ONLY_LABEL.test(text) || TEACHER_ONLY_HEADING.test(text);
}

export function filterStudentTable(block) {
  if (block.type !== "table" || !block.rows.length) return null;

  const [header, ...rows] = block.rows;
  const normalizedHeader = header.map((cell) => String(cell ?? "").trim());
  const hasRubricScale = normalizedHeader.some((cell) => /trọng\s*số|mô\s*tả\s*mức\s*đạt|thang\s*điểm/i.test(cell));
  const isCriterionScale = normalizedHeader.length >= 3
    && /^tiêu\s*chí$/i.test(normalizedHeader[0])
    && normalizedHeader.slice(1).every((cell) => /^\d+(?:\.\d+)?$/.test(cell));
  const isTeacherScoringTable = (hasRubricScale && normalizedHeader.every((cell) => SCORING_HEADER.test(cell))) || isCriterionScale;
  if (isTeacherScoringTable) return null;

  const hiddenColumns = new Set(normalizedHeader.flatMap((cell, index) =>
    ANSWER_COLUMN.test(cell) || PRIVATE_COLUMN.test(cell) ? [index] : [],
  ));
  if (header.some(isTeacherOnlyText) && hiddenColumns.size === 0) return null;

  const visibleColumns = normalizedHeader.map((_, index) => index).filter((index) => !hiddenColumns.has(index));
  if (!visibleColumns.length) return null;

  const visibleRows = rows
    .filter((row) => row.length && !isTeacherOnlyText(row[0]))
    .map((row) => visibleColumns.map((index) => String(row[index] ?? "")))
    .filter((row) => row.some((cell) => cell.trim()));
  if (!visibleRows.length) return null;

  return {
    type: "table",
    rows: [visibleColumns.map((index) => header[index]), ...visibleRows],
  };
}
