export class EmptySelectionError extends Error {
  constructor() {
    super("Hãy chọn một đoạn văn bản trong Word trước khi thực hiện thao tác này.");
    this.name = "EmptySelectionError";
  }
}

export class SelectionMismatchError extends Error {
  constructor() {
    super("Đoạn đang chọn trong Word không khớp với nội dung đã nạp để kiểm tra. Hãy chọn đúng đoạn trước khi áp dụng.");
    this.name = "SelectionMismatchError";
  }
}

export function ensureSelectionText(text: string): string {
  if (!text.trim()) throw new EmptySelectionError();
  return text;
}

function comparableSelectionText(text: string): string {
  return text.replace(/\r\n?/g, "\n").trim();
}

export function ensureSelectionMatches(actual: string, expected: string): string {
  ensureSelectionText(actual);
  if (!expected.trim() || comparableSelectionText(actual) !== comparableSelectionText(expected)) {
    throw new SelectionMismatchError();
  }
  return actual;
}

export async function readSelection(): Promise<string> {
  return Word.run(async (context) => {
    const range = context.document.getSelection();
    range.load("text");
    await context.sync();
    return ensureSelectionText(range.text);
  });
}

export async function replaceSelection(text: string): Promise<void> {
  await Word.run(async (context) => {
    const range = context.document.getSelection();
    range.load("text");
    await context.sync();
    ensureSelectionText(range.text);
    range.insertText(text, Word.InsertLocation.replace);
    await context.sync();
  });
}

export async function replaceSelectionIfMatches(expected: string, replacement: string): Promise<void> {
  await Word.run(async (context) => {
    const range = context.document.getSelection();
    range.load("text");
    await context.sync();
    ensureSelectionMatches(range.text, expected);
    range.insertText(replacement, Word.InsertLocation.replace);
    await context.sync();
  });
}

export async function insertBelowSelection(text: string): Promise<void> {
  await Word.run(async (context) => {
    const range = context.document.getSelection();
    const paragraph = range.insertParagraph(text, Word.InsertLocation.after);
    paragraph.font.name = "Times New Roman";
    paragraph.font.size = 13;
    paragraph.font.bold = false;
    paragraph.font.italic = false;
    paragraph.font.underline = Word.UnderlineType.none;
    paragraph.alignment = Word.Alignment.justified;
    paragraph.spaceBefore = 2;
    paragraph.spaceAfter = 2;
    paragraph.firstLineIndent = 28.3464567;
    paragraph.lineSpacing = 15.6;
    await context.sync();
  });
}

export async function insertBelowSelectionIfMatches(expected: string, text: string): Promise<void> {
  await Word.run(async (context) => {
    const range = context.document.getSelection();
    range.load("text");
    await context.sync();
    ensureSelectionMatches(range.text, expected);
    const paragraph = range.insertParagraph(text, Word.InsertLocation.after);
    paragraph.font.name = "Times New Roman";
    paragraph.font.size = 13;
    paragraph.font.bold = false;
    paragraph.font.italic = false;
    paragraph.font.underline = Word.UnderlineType.none;
    paragraph.alignment = Word.Alignment.justified;
    paragraph.spaceBefore = 2;
    paragraph.spaceAfter = 2;
    paragraph.firstLineIndent = 28.3464567;
    paragraph.lineSpacing = 15.6;
    await context.sync();
  });
}

export async function readDocumentText(): Promise<string> {
  return Word.run(async (context) => {
    const body = context.document.body;
    body.load("text");
    await context.sync();
    return body.text.trim();
  });
}

export async function replaceFirstInSelection(original: string, suggestion: string): Promise<void> {
  if (!original.trim()) throw new Error("Chuỗi lỗi không được để trống.");
  await Word.run(async (context) => {
    const range = context.document.getSelection();
    const results = range.search(original, { matchCase: true, matchWholeWord: false });
    results.load("items");
    await context.sync();
    const match = results.items[0];
    if (!match) throw new Error("Không tìm thấy lỗi này trong đoạn đang chọn của Word.");
    match.insertText(suggestion, Word.InsertLocation.replace);
    await context.sync();
  });
}
