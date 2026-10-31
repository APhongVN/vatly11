const NAME_HEADER = /^(?:họ\s*(?:và\s*)?tên|họ\s*ten|tên\s*học\s*sinh|student\s*name|full\s*name|name)$/i;
const FIRST_NAME_HEADER = /^(?:họ|surname|last\s*name)$/i;
const MIDDLE_NAME_HEADER = /^(?:tên\s*đệm|đệm|middle\s*name)$/i;
const GIVEN_NAME_HEADER = /^(?:tên|given\s*name|first\s*name)$/i;
const DELIMITERS = [",", ";", "\t"];

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

export function extractStudentNamesFromText(content) {
  const lines = String(content ?? "").replace(/^\uFEFF/, "").split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  if (!lines.length) return [];
  const firstLine = lines[0];
  const delimiter = DELIMITERS
    .map((candidate) => ({ candidate, count: [...firstLine].filter((character) => character === candidate).length }))
    .sort((a, b) => b.count - a.count)[0];
  if (!delimiter || delimiter.count === 0) return lines;

  const rows = lines.map((line) => parseDelimitedLine(line, delimiter.candidate));
  const headers = rows[0].map((cell) => cell.trim().replace(/^\uFEFF/, ""));
  const fullNameColumn = headers.findIndex((header) => NAME_HEADER.test(header));
  if (fullNameColumn >= 0) return rows.slice(1).map((row) => row[fullNameColumn] || "").filter(Boolean);

  const firstNameColumn = headers.findIndex((header) => FIRST_NAME_HEADER.test(header));
  const middleNameColumn = headers.findIndex((header) => MIDDLE_NAME_HEADER.test(header));
  const givenNameColumn = headers.findIndex((header) => GIVEN_NAME_HEADER.test(header));
  if (firstNameColumn >= 0 && givenNameColumn >= 0) {
    return rows.slice(1).map((row) => [row[firstNameColumn], middleNameColumn >= 0 ? row[middleNameColumn] : "", row[givenNameColumn]].filter(Boolean).join(" "));
  }
  return lines;
}
