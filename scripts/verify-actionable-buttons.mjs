import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../src");
const sourceFiles = [];
async function collect(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) await collect(fullPath);
    else if (/\.(tsx|jsx)$/.test(entry.name)) sourceFiles.push(fullPath);
  }
}
function hasAttribute(opening, name) {
  return opening.attributes.properties.some((property) => ts.isJsxAttribute(property) && property.name.getText() === name);
}
function stringAttribute(opening, name) {
  const attribute = opening.attributes.properties.find((property) => ts.isJsxAttribute(property) && property.name.getText() === name);
  return attribute && ts.isStringLiteral(attribute.initializer) ? attribute.initializer.text : "";
}
function hasFormSubmitHandler(opening) {
  let ancestor = opening.parent;
  while (ancestor) {
    if (ts.isJsxElement(ancestor) && ancestor.openingElement.tagName.getText() === "form" && hasAttribute(ancestor.openingElement, "onSubmit")) return true;
    ancestor = ancestor.parent;
  }
  return false;
}

await collect(root);
const issues = [];
let nativeButtonCount = 0;
for (const file of sourceFiles) {
  const source = await readFile(file, "utf8");
  const sourceFile = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  function visit(node) {
    if ((ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) && node.tagName.getText(sourceFile) === "button") {
      nativeButtonCount += 1;
      const isSharedButton = path.relative(root, file).split(path.sep).join("/") === "components/ui/Button.tsx";
      const hasClick = hasAttribute(node, "onClick");
      const isSubmit = stringAttribute(node, "type") === "submit" && hasFormSubmitHandler(node);
      if (!isSharedButton && !hasClick && !isSubmit) {
        const line = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1;
        issues.push(`${path.relative(root, file).replaceAll(path.sep, "/")}:${line}`);
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(sourceFile);
}
const sharedButton = await readFile(path.join(root, "components/ui/Button.tsx"), "utf8");
if (!/type = "button"/.test(sharedButton) || !/type=\{type\}/.test(sharedButton)) issues.push("components/ui/Button.tsx:default-type");
if (issues.length) {
  console.error(`Buttons without an explicit click handler or form submit action: ${issues.join(", ")}`);
  process.exitCode = 1;
} else {
  console.log(`Actionable buttons verified: ${nativeButtonCount} native buttons across ${sourceFiles.length} TSX/JSX files.`);
}
