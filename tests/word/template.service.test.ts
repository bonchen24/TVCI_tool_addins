import { insertTemplate } from "../../src/word/template.service";
import { TEMPLATE_CATALOG } from "../../src/templates/catalog";

type InsertedRangeMock = {
  select: jest.Mock<void, []>;
};

type TemplateContextMock = {
  document: {
    body: {
      insertFileFromBase64: jest.Mock<InsertedRangeMock, [string, string]>;
    };
  };
  sync: jest.Mock<Promise<void>, []>;
};

let previousWord: unknown;
let previousFetch: typeof fetch;
let previousDocument: unknown;
let activeContext: TemplateContextMock;
let insertedRange: InsertedRangeMock;

const template = TEMPLATE_CATALOG.find((record) => record.id === "iemm-cv-001")!;

beforeEach(() => {
  insertedRange = { select: jest.fn() };
  activeContext = {
    document: {
      body: {
        insertFileFromBase64: jest.fn<InsertedRangeMock, [string, string]>((_base64, _location) => insertedRange),
      },
    },
    sync: jest.fn().mockResolvedValue(undefined),
  };

  previousWord = (globalThis as typeof globalThis & { Word?: unknown }).Word;
  Object.defineProperty(globalThis, "Word", {
    configurable: true,
    writable: true,
    value: {
      InsertLocation: { end: "end" },
      run: jest.fn(async (callback: (context: TemplateContextMock) => Promise<void>) => callback(activeContext)),
    },
  });

  previousFetch = globalThis.fetch;
  Object.defineProperty(globalThis, "fetch", {
    configurable: true,
    writable: true,
    value: jest.fn().mockResolvedValue({
      ok: true,
      arrayBuffer: async () => new Uint8Array([1, 2, 3]).buffer as ArrayBuffer,
    }),
  });

  previousDocument = (globalThis as typeof globalThis & { document?: unknown }).document;
  Object.defineProperty(globalThis, "document", {
    configurable: true,
    writable: true,
    value: { baseURI: "https://intranet.example/tvci-word-tools/taskpane.html" },
  });
});

afterEach(() => {
  if (previousWord === undefined) Reflect.deleteProperty(globalThis, "Word");
  else Object.defineProperty(globalThis, "Word", { configurable: true, writable: true, value: previousWord });
  Object.defineProperty(globalThis, "fetch", { configurable: true, writable: true, value: previousFetch });
  if (previousDocument === undefined) Reflect.deleteProperty(globalThis, "document");
  else Object.defineProperty(globalThis, "document", { configurable: true, writable: true, value: previousDocument });
});

test("does not insert a built-in DOCX without canonical verification", async () => {
  await expect(insertTemplate(template)).rejects.toThrow(/canonical|x??c minh|verified/i);
  expect(globalThis.fetch).not.toHaveBeenCalled();
});
