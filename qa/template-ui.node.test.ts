import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("template library modal exposes organization tabs and search", async () => {
  const source = await readFile(new URL("../src/taskpane/components/TemplateLibraryModal.tsx", import.meta.url), "utf8");
  for (const label of ["Tất cả", "Gần đây", "Yêu thích", "Trung tâm Thử nghiệm - Kiểm định Công nghiệp", "Viện Cơ khí Năng lượng và Mỏ - Vinacomin", "Đảng"]) {
    assert.match(source, new RegExp(label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
  assert.match(source, /placeholder="🔍 Tìm kiếm mẫu văn bản/);
});

test("template library modal exposes quick insert and form opening actions", async () => {
  const source = await readFile(new URL("../src/taskpane/components/TemplateLibraryModal.tsx", import.meta.url), "utf8");
  assert.match(source, /Chèn nhanh/);
  assert.match(source, /Điền & Chèn/);
  assert.match(source, /onDirectInsert/);
  assert.match(source, /onOpenForm/);
});

test("taskpane renders dedicated AI view and clean status banner", async () => {
  const source = await readFile(new URL("../src/taskpane/App.tsx", import.meta.url), "utf8");
  assert.match(source, /<AiTaskpaneView/);
  assert.match(source, /className="appStatusBanner"/);
  assert.match(source, /aria-live="polite"/);
});

test("template cards keep descriptions readable on a narrow task pane", async () => {
  const styles = await readFile(new URL("../src/taskpane/styles.css", import.meta.url), "utf8");
  assert.match(styles, /\.app\s*\{[\s\S]*min-width:\s*0/);
  assert.match(styles, /\.grid2\s*\{[\s\S]*minmax\(0,\s*1fr\)/);
  assert.match(styles, /body\s*\{[\s\S]*overflow-x:\s*hidden/);
  assert.match(styles, /\.templateMeta\s*\{[\s\S]*min-width:\s*0/);
  assert.match(styles, /\.templateActions\s*\{[\s\S]*flex-wrap:\s*wrap/);
  assert.match(styles, /\.orgTabs\s*\{[\s\S]*minmax\(0,\s*1fr\)/);
  assert.match(styles, /\.orgTabs button\s*\{[\s\S]*min-width:\s*0/);
  assert.match(styles, /@media \(max-width: 520px\)[\s\S]*\.template\s*\{[\s\S]*grid-template-columns:\s*1fr/);
});

test("template navigation stays compact without vertical tab labels", async () => {
  const styles = await readFile(new URL("../src/taskpane/styles.css", import.meta.url), "utf8");
  const orgTab = styles.match(/\.orgTabs button\s*\{([^}]*)\}/)?.[1] ?? "";
  const subTabs = styles.match(/\.tvciSubTabs\s*\{([^}]*)\}/)?.[1] ?? "";
  const subTab = styles.match(/\.subTab\s*\{([^}]*)\}/)?.[1] ?? "";

  assert.match(orgTab, /font-size:\s*10px/);
  assert.match(orgTab, /min-height:\s*30px/);
  assert.match(subTabs, /display:\s*flex/);
  assert.match(subTabs, /overflow-x:\s*auto/);
  assert.match(subTab, /font-size:\s*10px/);
  assert.match(subTab, /white-space:\s*nowrap/);
  assert.match(subTab, /min-height:\s*30px/);
  assert.doesNotMatch(styles, /@media \(min-width: 420px\)[\s\S]*\.tvciSubTabs[\s\S]*grid-template-columns/);
});

test("task pane cards use a denser compact rhythm", async () => {
  const styles = await readFile(new URL("../src/taskpane/styles.css", import.meta.url), "utf8");
  const app = styles.match(/\.app\s*\{([^}]*)\}/)?.[1] ?? "";
  const card = styles.match(/\.card\s*\{([^}]*)\}/)?.[1] ?? "";
  const summary = styles.match(/\.sectionSummary\s*\{([^}]*)\}/)?.[1] ?? "";

  assert.match(app, /padding:\s*8px/);
  assert.match(app, /gap:\s*6px/);
  assert.match(card, /padding:\s*8px/);
  assert.match(summary, /padding:\s*8px/);
});

test("template cards display title, description and actions cleanly", async () => {
  const source = await readFile(new URL("../src/taskpane/components/TemplateLibraryModal.tsx", import.meta.url), "utf8");
  assert.match(source, /templateCardTitle/);
  assert.match(source, /templateCardDesc/);
  assert.match(source, /templateCardActions/);
});

test("taskpane can open the area requested by a Ribbon route", async () => {
  const source = await readFile(new URL("../src/taskpane/App.tsx", import.meta.url), "utf8");
  assert.match(source, /const params = new URLSearchParams\(window\.location\.search\)/);
  assert.match(source, /params\.get\("view"\)/);
  assert.match(source, /consumeFallbackView/);
});

test("taskpane keeps the AI back action compact and keyboard focus visible", async () => {
  const styles = await readFile(new URL("../src/taskpane/styles.css", import.meta.url), "utf8");
  assert.match(styles, /\.aiWorkspaceTopbar\s*>\s*button\s*\{[\s\S]*justify-self:\s*start/);
  assert.match(styles, /button:focus-visible/);
});

test("taskpane labels icon actions and announces operation status", async () => {
  const source = await readFile(new URL("../src/taskpane/App.tsx", import.meta.url), "utf8");
  assert.match(source, /aria-live="polite"/);
});

test("template insertion appends to the document body and reveals the inserted range", async () => {
  const source = await readFile(new URL("../src/word/template.service.ts", import.meta.url), "utf8");
  assert.match(source, /const insertedRange = context\.document\.body\.insertFileFromBase64\(base64, Word\.InsertLocation\.end\);/);
  assert.match(source, /insertedRange\.select\(\);/);
  assert.doesNotMatch(source, /getSelection\(\)/);
});

test("bundled template fetches bypass a stale WebView cache", async () => {
  const source = await readFile(new URL("../src/word/template.service.ts", import.meta.url), "utf8");
  assert.match(source, /resolveBundledTemplateUrl\(path: string\)/);
  assert.match(source, /fetch\(resolveBundledTemplateUrl\(template\.source\.path\),\s*\{\s*cache:\s*["']no-store["']\s*\}\)/);
});

test("taskpane handles clipboard failures without an unhandled promise", async () => {
  const source = await readFile(new URL("../src/taskpane/App.tsx", import.meta.url), "utf8");
  assert.match(source, /async function copyText\(/);
  assert.match(source, /Không thể sao chép tự động/);
  assert.doesNotMatch(source, /navigator\.clipboard\.writeText\(/);
});

test("template library modal supports favorite toggle", async () => {
  const source = await readFile(new URL("../src/taskpane/components/TemplateLibraryModal.tsx", import.meta.url), "utf8");
  assert.match(source, /toggleFavoriteTemplate/);
  assert.match(source, /getFavoriteTemplateIds/);
});

test("chat history actions use the taskpane error runner", async () => {
  const source = await readFile(new URL("../src/taskpane/App.tsx", import.meta.url), "utf8");
  assert.match(source, /const handleRenameConversation = \(conversation: ChatConversation\) => run\(async/);
  assert.match(source, /const handleDeleteConversation = \(conversation: ChatConversation\) => run\(async/);
  assert.match(source, /const handleClearStoredChats = \(\) => run\(async/);
});

test("chat UI state follows successful local persistence", async () => {
  const source = await readFile(new URL("../src/taskpane/App.tsx", import.meta.url), "utf8");
  const sendStart = source.indexOf("const handleSendChat");
  const quickStart = source.indexOf("const handleQuickDraft");
  const newChatStart = source.indexOf("const handleNewChat");
  assert.ok(sendStart >= 0 && quickStart > sendStart && newChatStart > quickStart);
  const sendBlock = source.slice(sendStart, quickStart);
  const quickBlock = source.slice(quickStart, newChatStart);
  assert.ok(sendBlock.indexOf("persistConversation(nextMessages)") < sendBlock.indexOf("setChatHistory(nextMessages)"));
  assert.ok(quickBlock.indexOf("persistConversation(nextMessages)") < quickBlock.indexOf("setChatHistory(nextMessages)"));
});

test("taskpane translates missing Word runtime errors into an actionable message", async () => {
  const source = await readFile(new URL("../src/taskpane/App.tsx", import.meta.url), "utf8");
  assert.match(source, /Office is not defined|Word is not defined/);
  assert.match(source, /Không kết nối được Word/);
  assert.match(source, /Hãy mở task pane trong Word/);
});
