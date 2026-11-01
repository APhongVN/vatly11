import { DOMParser } from "@xmldom/xmldom";
import ExcelJS from "exceljs";
import JSZip from "jszip";

const WORD_NS = "http://schemas.openxmlformats.org/wordprocessingml/2006/main";
const MATH_NS = "http://schemas.openxmlformats.org/officeDocument/2006/math";
const MAX_FILE_BYTES = 10 * 1024 * 1024;
const MAX_RUBRIC_CHARS = 20_000;
const MAX_ARCHIVE_EXPANDED_BYTES = 40 * 1024 * 1024;

function enforceArchiveExpansionLimit(zip, label) {
  const expandedBytes = Object.values(zip.files).reduce((total, entry) => {
    if (entry.dir) return total;
    const size = entry._data?.uncompressedSize;
    if (!Number.isSafeInteger(size) || size < 0) throw new Error(`Không xác minh được kích thước nội dung ${label}.`);
    return total + size;
  }, 0);
  if (expandedBytes > MAX_ARCHIVE_EXPANDED_BYTES) {
    throw new Error(`Tài liệu ${label} sau giải nén vượt quá giới hạn 40 MB.`);
  }
}

const nodeName = (node) => node.localName || node.nodeName.split(":").pop() || "";
const childElements = (node) => Array.from(node.childNodes).filter((child) => child.nodeType === 1);
const childNamed = (node, name) => childElements(node).find((child) => nodeName(child) === name) || null;

function mathAttribute(node, name) {
  if (!node || node.nodeType !== 1) return "";
  return node.getAttributeNS(MATH_NS, name) || node.getAttribute(`m:${name}`) || "";
}

function decodeMathCharacter(value) {
  if (/^[0-9a-f]{4,6}$/i.test(value)) {
    const codePoint = Number.parseInt(value, 16);
    return codePoint <= 0xffff ? String.fromCharCode(codePoint) : String.fromCodePoint(codePoint);
  }
  return value;
}

function escapeMathText(value) {
  return value.replace(/[#$%&~_^\\{}]/g, "\\$&");
}

function mathToLatex(node) {
  const name = nodeName(node);
  const children = childElements(node);
  const render = (child) => child ? mathToLatex(child) : "";
  const childText = (childName) => render(childNamed(node, childName));

  if (name.endsWith("Pr") || name === "ctrlPr") return "";
  if (name === "t") return escapeMathText(node.textContent || "");
  if (name === "chr") return escapeMathText(decodeMathCharacter(mathAttribute(node, "val")));
  if (name === "f") {
    const numerator = childText("num");
    const denominator = childText("den");
    return numerator && denominator ? `\\frac{${numerator}}{${denominator}}` : `${numerator}/${denominator}`;
  }
  if (name === "sSup") return `${childText("e")}^{${childText("sup")}}`;
  if (name === "sSub") return `${childText("e")}_{${childText("sub")}}`;
  if (name === "sSubSup") return `${childText("e")}_{${childText("sub")}}^{${childText("sup")}}`;
  if (name === "rad") {
    const degree = childText("deg");
    const radicand = childText("e");
    return degree ? `\\sqrt[${degree}]{${radicand}}` : `\\sqrt{${radicand}}`;
  }
  if (name === "d") {
    const properties = childNamed(node, "dPr");
    const begin = decodeMathCharacter(mathAttribute(childNamed(properties || node, "begChr"), "val")) || "(";
    const end = decodeMathCharacter(mathAttribute(childNamed(properties || node, "endChr"), "val")) || ")";
    return `${escapeMathText(begin)}${childText("e")}${escapeMathText(end)}`;
  }
  if (name === "bar") return `\\overline{${childText("e")}}`;
  if (name === "acc") {
    const symbol = decodeMathCharacter(mathAttribute(childNamed(childNamed(node, "accPr"), "chr"), "val"));
    const command = symbol === "̂" ? "hat" : symbol === "̃" ? "tilde" : symbol === "̇" ? "dot" : symbol === "̈" ? "ddot" : "overline";
    return `\\${command}{${childText("e")}}`;
  }
  if (name === "nary") {
    const properties = childNamed(node, "naryPr");
    const symbol = decodeMathCharacter(mathAttribute(childNamed(properties || node, "chr"), "val")) || "∑";
    const sub = childText("sub");
    const sup = childText("sup");
    return `${escapeMathText(symbol)}${sub ? `_{${sub}}` : ""}${sup ? `^{${sup}}` : ""}${childText("e")}`;
  }
  if (name === "func") return `${childText("fName")}\\left(${childText("e")}\\right)`;
  if (name === "m") {
    const rows = children.filter((child) => nodeName(child) === "mr").map((row) =>
      childElements(row).filter((cell) => nodeName(cell) === "e").map((cell) => mathToLatex(cell)).join(" & "),
    );
    return rows.length ? `\\begin{matrix}${rows.join(" \\\\ ")}\\end{matrix}` : children.map(render).join("");
  }
  if (name === "eqArr") return children.filter((child) => nodeName(child) === "e").map(render).join(" \\\\ ");
  return children.map(render).join("");
}

function inlineWordText(node) {
  return childElements(node).map((child) => {
    const name = nodeName(child);
    if (name === "oMath" || name === "oMathPara") {
      const formula = mathToLatex(child).trim();
      return formula ? ` $${formula}$ ` : "";
    }
    if (name === "t" && child.namespaceURI === WORD_NS) return child.textContent || "";
    if (name === "tab") return "\t";
    if (name === "br" || name === "cr") return " ";
    return inlineWordText(child);
  }).join("");
}

function wordBlockText(node) {
  const name = nodeName(node);
  if (name === "p") {
    const text = inlineWordText(node).replace(/[ \t]{2,}/g, " ").trim();
    return text ? [text] : [];
  }
  if (name !== "tbl") return [];
  const rows = [];
  for (const row of childElements(node).filter((child) => nodeName(child) === "tr")) {
    const cells = childElements(row).filter((child) => nodeName(child) === "tc").map((cell) => {
      const pieces = childElements(cell).flatMap(wordBlockText);
      return pieces.join(" ").trim();
    });
    if (cells.some(Boolean)) rows.push(cells.join(" | "));
  }
  return rows;
}

export function extractWordDocumentText(xml) {
  const parser = new DOMParser({
    errorHandler: { warning: () => undefined, error: () => undefined, fatalError: () => undefined },
  });
  const document = parser.parseFromString(xml, "application/xml");
  const body = document.getElementsByTagNameNS(WORD_NS, "body").item(0);
  if (!body) throw new Error("Không tìm thấy phần nội dung trong tài liệu Word.");
  return childElements(body).flatMap(wordBlockText).join("\n").trim();
}

async function requestOcr(dataUrl) {
  const response = await fetch("/api/ocr", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ imageData: dataUrl, mimeType: "image/jpeg" }),
  });
  const result = await response.json();
  if (!response.ok || !result.text?.trim()) throw new Error(result.error || "Không trích được chữ từ ảnh.");
  return result.text.trim();
}

async function imageToJpeg(file) {
  if (typeof createImageBitmap !== "function") throw new Error("Trình duyệt không hỗ trợ đọc ảnh để nhận dạng.");
  const image = await createImageBitmap(file);
  try {
    const scale = Math.min(1, 1800 / image.width, 2400 / image.height);
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(image.width * scale));
    canvas.height = Math.max(1, Math.round(image.height * scale));
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Không thể xử lý ảnh ma trận trên trình duyệt này.");
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/jpeg", 0.84);
  } finally {
    image.close();
  }
}

async function renderPdfPageToJpeg(page) {
  const naturalViewport = page.getViewport({ scale: 1 });
  const scale = Math.min(1.5, 1800 / naturalViewport.width, 2400 / naturalViewport.height);
  const viewport = page.getViewport({ scale });
  const canvas = document.createElement("canvas");
  canvas.width = Math.ceil(viewport.width);
  canvas.height = Math.ceil(viewport.height);
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Không thể dựng trang PDF để nhận dạng.");
  await page.render({ canvas, canvasContext: context, viewport }).promise;
  return canvas.toDataURL("image/jpeg", 0.82);
}

export async function extractRubricFile(file, ocrImage = requestOcr) {
  const extension = file.name.split(".").pop()?.toLocaleLowerCase() || "";
  const imageExtensions = ["png", "jpg", "jpeg", "webp"];
  if (!["txt", "md", "csv", "docx", "xlsx", "pdf", ...imageExtensions].includes(extension)) {
    throw new Error("Chỉ nhận TXT, Markdown, CSV, Word, Excel, PDF hoặc ảnh PNG/JPG/WebP.");
  }
  if (file.size <= 0 || file.size > MAX_FILE_BYTES) throw new Error("File ma trận phải lớn hơn 0 byte và tối đa 10 MB.");
  if (file.name.length > 255) throw new Error("Tên file ma trận tối đa 255 ký tự.");

  let text = "";
  const warnings = [];
  if (["txt", "md", "csv"].includes(extension)) {
    text = new TextDecoder("utf-8", { fatal: false }).decode(await file.arrayBuffer());
  } else if (extension === "docx") {
    const zip = await JSZip.loadAsync(await file.arrayBuffer());
    enforceArchiveExpansionLimit(zip, "Word");
    const documentXml = zip.file("word/document.xml");
    if (!documentXml) throw new Error("File Word không có phần nội dung hợp lệ.");
    const xml = await documentXml.async("string");
    if (xml.length > 20 * 1024 * 1024) throw new Error("Nội dung Word sau giải nén vượt quá giới hạn 20 MB.");
    text = extractWordDocumentText(xml);
  } else if (extension === "xlsx") {
    const zip = await JSZip.loadAsync(await file.arrayBuffer());
    enforceArchiveExpansionLimit(zip, "Excel");
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(await file.arrayBuffer());
    const fragments = [];
    let remainingCells = 20_000;
    workbook.worksheets.slice(0, 10).forEach((sheet) => {
      fragments.push(`# ${sheet.name}`);
      const finalRow = Math.min(sheet.rowCount, 2_000);
      for (let rowIndex = 1; rowIndex <= finalRow && remainingCells > 0; rowIndex += 1) {
        const row = sheet.getRow(rowIndex);
        const cells = [];
        row.eachCell({ includeEmpty: false }, (cell) => {
          if (remainingCells <= 0) return;
          remainingCells -= 1;
          const value = cell.text.trim();
          if (value) cells.push(value);
        });
        if (cells.length) fragments.push(cells.join(" | "));
      }
      if (sheet.rowCount > finalRow || remainingCells <= 0) warnings.push("Đã đọc tối đa 2.000 dòng mỗi sheet và 20.000 ô đầu; file gốc vẫn được lưu đầy đủ.");
    });
    text = fragments.join("\n");
  } else if (extension === "pdf") {
    const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
    const pdf = await pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise;
    const pages = [];
    let scannedPages = 0;
    try {
      for (let index = 1; index <= Math.min(pdf.numPages, 30); index += 1) {
        const page = await pdf.getPage(index);
        const content = await page.getTextContent();
        const pageText = content.items.map((item) => item.str || "").join(" ").trim();
        if (pageText) {
          pages.push(`[Trang ${index}] ${pageText}`);
        } else if (scannedPages < 5) {
          scannedPages += 1;
          const image = await renderPdfPageToJpeg(page);
          pages.push(`[Trang ${index}] ${await ocrImage(image)}`);
        } else {
          warnings.push("Chỉ nhận dạng tối đa 5 trang PDF scan để tránh gửi quá nhiều yêu cầu AI.");
        }
      }
    } finally {
      await pdf.destroy();
    }
    if (pdf.numPages > 30) warnings.push("Đã đọc 30 trang đầu của PDF; file gốc vẫn được lưu đầy đủ.");
    text = pages.join("\n\n");
  } else {
    text = await ocrImage(await imageToJpeg(file));
  }

  const normalized = text.replace(/\0/g, "").trim();
  if (!normalized) throw new Error("Không trích được nội dung trong file ma trận.");
  const clipped = normalized.slice(0, MAX_RUBRIC_CHARS);
  if (normalized.length > clipped.length) warnings.push("Đã cắt nội dung ở 20.000 ký tự; file gốc vẫn được lưu đầy đủ.");
  return { text: clipped, warning: [...new Set(warnings)].join(" ") };
}
