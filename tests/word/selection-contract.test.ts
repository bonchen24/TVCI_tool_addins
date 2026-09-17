import { ensureSelectionMatches, ensureSelectionText, EmptySelectionError, insertBelowSelection, insertBelowSelectionIfMatches, replaceSelection, replaceSelectionIfMatches, SelectionMismatchError } from "../../src/word/selection.service";

type RequestContextMock = {
  document: { getSelection: jest.Mock<SelectionRangeMock, []> };
  sync: jest.Mock<Promise<void>, []>;
};

type ParagraphMock = {
  font: {
    name: string;
    size: number;
    bold: boolean;
    italic: boolean;
    underline: unknown;
  };
  alignment: unknown;
  spaceBefore: number;
  spaceAfter: number;
  firstLineIndent: number;
  lineSpacing: number;
};

type SelectionRangeMock = {
  text: string;
  load: jest.Mock<void, [string]>;
  insertText: jest.Mock<void, [string, unknown]>;
  insertParagraph: jest.Mock<ParagraphMock, [string, unknown]>;
};

type WordRuntimeMock = {
  InsertLocation: { replace: string; after: string };
  UnderlineType: { none: string };
  Alignment: { justified: string };
  run: jest.Mock<Promise<void>, [(context: RequestContextMock) => Promise<void>]>;
};

let previousWord: unknown;
let activeContext: RequestContextMock;
let activeRange: SelectionRangeMock;

beforeEach(() => {
  const paragraph: ParagraphMock = {
    font: { name: "", size: 0, bold: false, italic: false, underline: "" },
    alignment: "",
    spaceBefore: 0,
    spaceAfter: 0,
    firstLineIndent: 0,
    lineSpacing: 0,
  };
  const range: SelectionRangeMock = {
    text: "Đoạn A",
    load: jest.fn(),
    insertText: jest.fn(),
    insertParagraph: jest.fn<ParagraphMock, [string, unknown]>((_text, _location) => paragraph),
  };
  const context: RequestContextMock = {
    document: { getSelection: jest.fn(() => range) },
    sync: jest.fn().mockResolvedValue(undefined),
  };
  activeContext = context;
  activeRange = range;
  const runtime: WordRuntimeMock = {
    InsertLocation: { replace: "replace", after: "after" },
    UnderlineType: { none: "none" },
    Alignment: { justified: "justified" },
    run: jest.fn(async (callback) => callback(activeContext)),
  };
  previousWord = (globalThis as typeof globalThis & { Word?: unknown }).Word;
  Object.defineProperty(globalThis, "Word", { configurable: true, writable: true, value: runtime });
});

afterEach(() => {
  if (previousWord === undefined) Reflect.deleteProperty(globalThis, "Word");
  else Object.defineProperty(globalThis, "Word", { configurable: true, writable: true, value: previousWord });
});

test("empty selection is rejected", () => {
  expect(() => ensureSelectionText("   ")).toThrow(EmptySelectionError);
});

test("non-empty selection is preserved", () => {
  expect(ensureSelectionText("Nội dung")).toBe("Nội dung");
});

test("selection matching tolerates Word line endings but rejects a different paragraph", () => {
  expect(ensureSelectionMatches("Dòng một\r\nDòng hai\r", "Dòng một\nDòng hai")).toBe("Dòng một\r\nDòng hai\r");
  expect(() => ensureSelectionMatches("Đoạn A", "Đoạn B")).toThrow(SelectionMismatchError);
});

test("replaceSelection writes the accepted content into the current Word selection", async () => {
  await replaceSelection("Nội dung AI đã chấp nhận");
  const range = activeContext.document.getSelection.mock.results[0]?.value;
  expect(range.insertText).toHaveBeenCalledWith("Nội dung AI đã chấp nhận", "replace");
});

test("replaceSelection rejects an empty Word selection instead of inserting at the cursor", async () => {
  activeRange.text = "   ";
  await expect(replaceSelection("Nội dung AI đã chấp nhận")).rejects.toThrow(EmptySelectionError);
  expect(activeRange.insertText).not.toHaveBeenCalled();
});

test("insertBelowSelection writes the accepted content after the current Word selection", async () => {
  await insertBelowSelection("Nội dung AI bên dưới");
  const range = activeContext.document.getSelection.mock.results[0]?.value;
  expect(range.insertParagraph).toHaveBeenCalledWith("Nội dung AI bên dưới", "after");
});

test("replaceSelectionIfMatches refuses to overwrite a changed Word selection", async () => {
  await expect(replaceSelectionIfMatches("Đoạn B", "Bản AI")).rejects.toThrow(SelectionMismatchError);
  const range = activeContext.document.getSelection.mock.results[0]?.value;
  expect(range.insertText).not.toHaveBeenCalled();
});

test("insertBelowSelectionIfMatches refuses to insert below a changed Word selection", async () => {
  await expect(insertBelowSelectionIfMatches("Đoạn B", "Bản AI bên dưới")).rejects.toThrow(SelectionMismatchError);
  const range = activeContext.document.getSelection.mock.results[0]?.value;
  expect(range.insertParagraph).not.toHaveBeenCalled();
});
