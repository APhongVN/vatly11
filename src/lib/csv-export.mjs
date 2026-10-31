export function csvSafeCell(value) {
  const text = String(value ?? "");
  const spreadsheetSafeText = /^[=+\-@\t\r\n]/.test(text) ? `'${text}` : text;
  return `"${spreadsheetSafeText.replace(/"/g, '""')}"`;
}