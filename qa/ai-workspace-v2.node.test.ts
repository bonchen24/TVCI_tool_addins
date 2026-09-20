import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const app = [
  fs.readFileSync("src/taskpane/App.tsx", "utf8"),
  fs.readFileSync("src/taskpane/components/AiTaskpaneView.tsx", "utf8"),
  fs.readFileSync("src/taskpane/components/TemplateFormModal.tsx", "utf8"),
].join("\n");
const wordContext = fs.readFileSync("src/word/ai-context.service.ts", "utf8");
const selectionService = fs.readFileSync("src/word/selection.service.ts", "utf8");

test("AI workspace v2 exposes document-context and quick drafting controls", () => {
  assert.match(app, /collectDocumentContext|Đã đọc tài liệu/);
  assert.match(app, /QUICK_DRAFT_ACTIONS/);
  assert.match(app, /Viết nhanh/);
  assert.match(app, /buildQuickDraftPrompt/);
});

test("AI chat only includes Word context after the user explicitly reads it", () => {
  const sendHandler = app.slice(app.indexOf("const handleSendChat"), app.indexOf("const handleQuickDraft"));
  assert.doesNotMatch(sendHandler, /await collectDocumentContext\(\)/);
  assert.match(sendHandler, /documentContext/);
  assert.match(app, /const handleReadDocumentContext[\s\S]*collectDocumentContext\(\)/);
  assert.match(app, /buildDocumentContextBlock\(documentContext\)/);
});

test("AI workspace v2 exposes persistent recent chats", () => {
  assert.match(app, /loadChatConversations/);
  assert.match(app, /saveChatConversations/);
  assert.match(app, /clearChatConversations|Xóa.*chat/i);
});

test("AI workspace v2 offers per-issue and safe proofreading actions", () => {
  assert.match(app, /handleApplyProofreadingIssue/);
  assert.match(app, /handleIgnoreProofreadingIssue/);
  assert.match(app, /handleApplySafeProofreading/);
  assert.match(app, /replaceFirstInSelection/);
  assert.match(app, /applySafeProofreadingIssues/);
  assert.match(app, /replaceSelectionIfMatches/);
});

test("accepted AI draft exposes explicit Word apply actions", () => {
  assert.match(app, /onApplyText/);
  assert.match(app, /onReplaceSelection/);
  assert.match(app, /onInsertBelow/);
  assert.match(app, /Thay đoạn chọn|Chèn dưới|Áp dụng/);
});

test("AI draft is no longer marked accepted after it is applied", () => {
  assert.match(app, /setAiDraftAccepted\(false\)/);
});

test("template fill can draft missing narrative prose", () => {
  assert.match(app, /handleDraftTemplateNarrative/);
  assert.match(app, /buildTemplateNarrativePrompt/);
});

test("template narrative requires explicit acceptance before Word insertion", () => {
  assert.match(app, /templateNarrativeAccepted/);
  assert.match(app, /Hãy chấp nhận nội dung AI trước khi điền vào Word/);
  assert.match(app, /setTemplateNarrativeAccepted\(false\)/);
  const insertHandler = app.slice(app.indexOf("const handleInsertTemplateNarrative"), app.indexOf("const handleProofread"));
  assert.match(insertHandler, /await insertBelowSelection\(templateNarrativePreview\)/);
});

test("starting or switching AI work clears stale template narrative state", () => {
  const newChatHandler = app.slice(app.indexOf("const handleNewChat"), app.indexOf("const handleSelectAiDraft"));
  const selectHandler = app.slice(app.indexOf("const handleSelectAiDraft"), app.indexOf("const handleRenameConversation"));
  assert.match(newChatHandler, /setTemplateNarrativePreview\(\"\"\)/);
  assert.match(newChatHandler, /setTemplateNarrativeAccepted\(false\)/);
  assert.match(selectHandler, /setTemplateNarrativePreview\(\"\"\)/);
  assert.match(selectHandler, /setTemplateNarrativeAccepted\(false\)/);
});

test("template fill surfaces suggestions needing review", () => {
  assert.match(app, /handleDraftTemplateNarrative|templateFillFields/);
});

test("Word context service reads body selection and tagged content controls", () => {
  assert.match(wordContext, /document\.body/);
  assert.match(wordContext, /getSelection/);
  assert.match(wordContext, /contentControls/);
});

test("selection service can replace the first issue occurrence in current Word selection", () => {
  assert.match(selectionService, /replaceFirstInSelection/);
  assert.match(selectionService, /replaceSelectionIfMatches/);
  assert.match(selectionService, /search\(/);
});
