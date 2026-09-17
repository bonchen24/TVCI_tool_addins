import test from "node:test";
import assert from "node:assert/strict";
import { buildDocumentContextBlock, buildQuickDraftPrompt, inferDocumentType, QUICK_DRAFT_ACTIONS } from "../src/ai/document-context.ts";

const context = {
  documentText: "CÔNG VĂN\nV/v đề nghị bổ sung hồ sơ\nKính gửi: Công ty ABC",
  selectionText: "Đề nghị Quý Công ty bổ sung hồ sơ.",
  controls: [
    { id: 1, tag: "TEN_KHACH_HANG", title: "Tên khách hàng" },
    { id: 2, tag: "SO_HO_SO", title: "Số hồ sơ" },
  ],
  activeTemplateName: "Công văn hành chính TVCI",
  documentType: "CÔNG VĂN",
  ruleProfileName: "NĐ30 / TVCI",
};

test("document context block includes template, profile, selection and content-control tags", () => {
  const block = buildDocumentContextBlock(context);
  assert.match(block, /Công văn hành chính TVCI/);
  assert.match(block, /NĐ30 \/ TVCI/);
  assert.match(block, /TEN_KHACH_HANG/);
  assert.match(block, /Đề nghị Quý Công ty bổ sung hồ sơ/);
  assert.match(block, /Loại văn bản: CÔNG VĂN/);
});

test("document context infers a known document type from Word text", () => {
  assert.equal(inferDocumentType("CƠ QUAN\r\nCÔNG VĂN:\r\nV/v đề nghị"), "CÔNG VĂN");
  assert.equal(inferDocumentType("Nội dung chưa có tên loại"), undefined);
});

test("quick drafting actions expose the agreed Word-writing helpers", () => {
  const ids = QUICK_DRAFT_ACTIONS.map((item) => item.id);
  const expectedActions = ["opening", "basis", "continue", "main", "conclusion", "addressee", "recipients", "next_article"] as const;
  for (const id of expectedActions) {
    assert.ok(ids.includes(id), `missing ${id}`);
  }
});

test("quick drafting prompt is grounded in document context and forbids invented facts", () => {
  const prompt = buildQuickDraftPrompt({ action: "basis", context, userInstruction: "Giữ nguyên số hồ sơ" });
  assert.match(prompt, /Căn cứ/);
  assert.match(prompt, /không tự bịa/i);
  assert.match(prompt, /Công văn hành chính TVCI/);
  assert.match(prompt, /Giữ nguyên số hồ sơ/);
});
