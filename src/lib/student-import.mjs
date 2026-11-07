const NAME_HEADER = /^(?:họ\s*(?:và\s*)?tên(?:\s*học\s*sinh)?|tên\s*(?:học\s*sinh|đầy\s*đủ)|student\s*name|full\s*name|name)$/i;
const FIRST_NAME_HEADER = /^(?:họ|surname|last\s*name)$/i;
const MIDDLE_NAME_HEADER = /^(?:tên\s*đệm|đệm|middle\s*name)$/i;
const GIVEN_NAME_HEADER = /^(?:tên|given\s*name|first\s*name)$/i;
const STUDENT_CODE_HEADER = /^(?:mã\s*(?:số\s*)?(?:sinh\s*viên|học\s*sinh|sv|hs)|mssv|msv|mã\s*sv|student\s*(?:id|code)|code|id)$/i;
const DELIMITERS = [",", ";", "\t"];
const NON_NAME_HEADERS = /^(?:stt|mã(?:\s*(?:học\s*sinh|sinh\s*viên|hs|sv|số\s*sinh\s*viên))?|id|lớp|class|năm\s*sinh|ngày\s*sinh|giới\s*tính|email|sđt|số\s*điện\s*thoại|ghi\s*chú|học\s*sinh|sinh\s*viên|student|code)$/i;

function countUnquotedDelimiters(line, delimiter) {
  let count = 0;
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    if (character === '"') {
      if (quoted && line[index + 1] === '"') index += 1;
      else quoted = !quoted;
    } else if (character === delimiter && !quoted) count += 1;
  }
  return count;
}

function parseDelimitedLine(line, delimiter) {
  const cells = [];
  let cell = "";
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    if (character === '"') {
      if (quoted && line[index + 1] === '"') { cell += '"'; index += 1; }
      else quoted = !quoted;
    } else if (character === delimiter && !quoted) {
      cells.push(cell.trim());
      cell = "";
    } else cell += character;
  }
  cells.push(cell.trim());
  return cells;
}

function looksLikeStudentName(value) {
  const candidate = String(value ?? "").trim().replace(/^\uFEFF/, "");
  return candidate.length >= 3
    && !/^\d+$/.test(candidate)
    && candidate.split(/\s+/).length >= 2
    && !NON_NAME_HEADERS.test(candidate);
}

export function extractStudentNamesFromText(content) {
  return extractStudentRowsFromText(content).map((row) => row.fullName);
}

/**
 * Trích xuất danh sách học sinh kèm mã số sinh viên (nếu tệp có cột mã).
 * Trả về mảng { fullName, studentCode } — studentCode rỗng khi tệp không có cột mã.
 */
export function extractStudentRowsFromText(content) {
  const lines = String(content ?? "").replace(/^\uFEFF/, "").split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  if (!lines.length) return [];
  const firstLine = lines[0];
  const delimiter = DELIMITERS
    .map((candidate) => ({ candidate, count: countUnquotedDelimiters(firstLine, candidate) }))
    .sort((a, b) => b.count - a.count)[0];
  if (!delimiter || delimiter.count === 0) return lines.map((line) => ({ fullName: line, studentCode: "" }));

  const rows = lines.map((line) => parseDelimitedLine(line, delimiter.candidate));
  const headers = rows[0].map((cell) => cell.trim().replace(/^\uFEFF/, ""));
  const dataRows = rows.slice(1);
  const codeColumn = headers.findIndex((header) => STUDENT_CODE_HEADER.test(header));
  const codeOf = (row) => (codeColumn >= 0 ? String(row[codeColumn] || "").trim() : "");
  const toRow = (name, row) => ({ fullName: name, studentCode: codeOf(row) });

  const fullNameColumn = headers.findIndex((header) => NAME_HEADER.test(header));
  if (fullNameColumn >= 0) {
    return dataRows
      .map((row) => toRow((row[fullNameColumn] || "").trim(), row))
      .filter((entry) => looksLikeStudentName(entry.fullName));
  }

  const firstNameColumn = headers.findIndex((header) => FIRST_NAME_HEADER.test(header));
  const middleNameColumn = headers.findIndex((header) => MIDDLE_NAME_HEADER.test(header));
  const givenNameColumn = headers.findIndex((header) => GIVEN_NAME_HEADER.test(header));
  if (firstNameColumn >= 0 && givenNameColumn >= 0) {
    return dataRows
      .map((row) => toRow([row[firstNameColumn], middleNameColumn >= 0 ? row[middleNameColumn] : "", row[givenNameColumn]].filter(Boolean).join(" "), row))
      .filter((entry) => looksLikeStudentName(entry.fullName));
  }

  const hasHeader = headers.some((header) => NAME_HEADER.test(header) || FIRST_NAME_HEADER.test(header)
    || MIDDLE_NAME_HEADER.test(header) || GIVEN_NAME_HEADER.test(header) || NON_NAME_HEADERS.test(header));
  const candidateRows = hasHeader ? dataRows : rows;
  const columnCount = candidateRows.length ? Math.max(...candidateRows.map((row) => row.length)) : 0;
  let selectedColumn = -1;
  let selectedCount = 0;
  for (let column = 0; column < columnCount; column += 1) {
    const count = candidateRows.reduce((total, row) => total + (looksLikeStudentName(row[column]) ? 1 : 0), 0);
    if (count > selectedCount) { selectedCount = count; selectedColumn = column; }
  }
  if (selectedColumn >= 0) {
    return candidateRows
      .map((row) => toRow((row[selectedColumn] || "").trim(), row))
      .filter((entry) => looksLikeStudentName(entry.fullName));
  }
  return [];
}