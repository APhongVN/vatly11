export const splitExcelCellText = (value, maxLength = 30_000) => {
  const text = String(value ?? "");
  if (!Number.isInteger(maxLength) || maxLength < 1) {
    throw new RangeError("maxLength must be a positive integer");
  }
  if (text.length <= maxLength) return [text];

  const chunks = [];
  for (let start = 0; start < text.length;) {
    let end = Math.min(start + maxLength, text.length);
    const previousCodeUnit = text.charCodeAt(end - 1);
    const nextCodeUnit = text.charCodeAt(end);
    const splitsSurrogatePair = previousCodeUnit >= 0xd800 && previousCodeUnit <= 0xdbff
      && nextCodeUnit >= 0xdc00 && nextCodeUnit <= 0xdfff;
    if (end < text.length && splitsSurrogatePair) end -= 1;
    chunks.push(text.slice(start, end));
    start = end;
  }
  return chunks;
};
