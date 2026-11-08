/**
 * Chuẩn hóa LaTeX/markdown cho KaTeX để công thức Vật lí luôn hiển thị đúng.
 * Xử lý các dạng phổ biến mà AI hoặc tài liệu Word trả về:
 *  - `\( ... \)` / `\[ ... \]` (LaTeX chuẩn) -> `$ ... $` / `$$ ... $$`
 *  - `\begin{equation}...\end{equation}` -> `$$ ... $$`
 *  - Thêm khoảng trắng quanh `$` inline khi thiếu để remark-math nhận diện.
 * Không thay đổi nội dung bên trong công thức.
 */
export function normalizeLatexForMarkdown(input: string): string {
  if (!input) return "";
  let text = input.replace(/\r\n/g, "\n");

  // Loại bỏ môi trường equation/align của LaTeX về dạng $$ ... $$.
  text = text.replace(/\\begin\{(equation|equation\*|align|align\*|gather|gather\*)\}/g, "$$");
  text = text.replace(/\\end\{(equation|equation\*|align|align\*|gather|gather\*)\}/g, "$$");

  // \( ... \) -> $ ... $  và  \[ ... \] -> $$ ... $$
  text = text.replace(/\\\((.+?)\\\)/gs, (_match, body) => `$${body.trim()}$`);
  text = text.replace(/\\\[(.+?)\\\]/gs, (_match, body) => `$$${body.trim()}$$`);

  // Bảo vệ các khối $$ ... $$ rồi mới xử lý $ inline.
  const displayBlocks: string[] = [];
  text = text.replace(/\$\$([\s\S]+?)\$\$/g, (match) => {
    displayBlocks.push(match);
    return `\u0000D${displayBlocks.length - 1}\u0000`;
  });
  // Thêm khoảng trắng quanh $ inline khi dính chữ/số để remark-math nhận diện.
  text = text.replace(/([^\s$])\$([^\s$])/g, "$1 $ $2");
  // Khôi phục khối $$ ... $$.
  text = text.replace(/\u0000D(\d+)\u0000/g, (_match, index) => displayBlocks[Number(index)] ?? "");

  return text;
}
