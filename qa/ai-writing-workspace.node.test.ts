import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { WRITING_STYLES, buildWritingPrompt } from "../src/ai/writing-workspace.ts";
import { buildTemplateFillPrompt, parseTemplateFillResult } from "../src/ai/template-fill.ts";
import { buildProofreadingPrompt, parseProofreadingResult } from "../src/ai/proofreading.ts";

const manifest = fs.readFileSync(path.join(process.cwd(), "manifest/manifest.xml"), "utf8");

test("writing workspace exposes agreed Vietnamese writing styles", () => {
  const ids = WRITING_STYLES.map((item) => item.id);
  assert.deepEqual(ids, ["administrative", "formal", "concise", "clear", "persuasive", "neutral", "preserve"]);
});

test("writing prompt includes prior chat context and protects factual identifiers", () => {
  const prompt = buildWritingPrompt({
    input: "Công ty ABC cần bổ sung hồ sơ.",
    style: "administrative",
    history: [
      { role: "user", content: "Soạn công văn đề nghị bổ sung." },
      { role: "assistant", content: "Dự thảo lần 1" },
    ],
  });
  assert.match(prompt, /Công ty ABC cần bổ sung hồ sơ/);
  assert.match(prompt, /văn phong hành chính/i);
  assert.match(prompt, /không tự bịa/i);
  assert.match(prompt, /Dự thảo lần 1/);
});

test("template fill prompt lists only available content-control tags", () => {
  const prompt = buildTemplateFillPrompt(
    [
      { id: 1, tag: "TEN_KHACH_HANG", title: "Tên khách hàng" },
      { id: 2, tag: "SO_HO_SO", title: "Số hồ sơ" },
    ],
    "Công ty ABC; hồ sơ PCN-001",
  );
  assert.match(prompt, /TEN_KHACH_HANG/);
  assert.match(prompt, /SO_HO_SO/);
  assert.match(prompt, /không được tạo tag mới/i);
});

test("template fill parser preserves missing values instead of inventing them", () => {
  const result = parseTemplateFillResult(`\`\`\`json
  {"fields":[
    {"tag":"TEN_KHACH_HANG","value":"Công ty ABC","confidence":0.98,"source":"Công ty ABC"},
    {"tag":"SO_HO_SO","value":null,"confidence":0,"source":""}
  ]}
  \`\`\``);
  assert.equal(result[0].value, "Công ty ABC");
  assert.equal(result[1].value, null);
});

test("proofreading parser separates spelling grammar capitalization punctuation and administrative style", () => {
  const parsed = parseProofreadingResult(JSON.stringify({
    revisedText: "Công ty đề nghị bổ sung hồ sơ.",
    issues: [
      { category: "spelling", original: "bổ xung", suggestion: "bổ sung", explanation: "Sai chính tả", position: 15, context: "đề nghị bổ xung hồ sơ" },
      { category: "punctuation", original: "hồ sơ ,", suggestion: "hồ sơ,", explanation: "Thừa khoảng trắng" },
    ],
  }));
  assert.equal(parsed.revisedText, "Công ty đề nghị bổ sung hồ sơ.");
  assert.equal(parsed.issues[0].category, "spelling");
  assert.equal(parsed.issues[0].position, 15);
  assert.equal(parsed.issues[0].context, "đề nghị bổ xung hồ sơ");
  assert.equal(parsed.issues[1].category, "punctuation");
});

test("proofreading prompt instructs AI not to alter technical identifiers", () => {
  const prompt = buildProofreadingPrompt("Model ABC-123 theo TCVN 1234:2025.");
  assert.match(prompt, /ABC-123/);
  assert.match(prompt, /TCVN 1234:2025/);
  assert.match(prompt, /không thay đổi.*model.*tiêu chuẩn/i);
});

test("proofreading parser ignores issues without an original span", () => {
  const parsed = parseProofreadingResult(JSON.stringify({
    revisedText: "Nội dung đúng.",
    issues: [{ category: "grammar", original: "", suggestion: "sửa", explanation: "Thiếu vị trí" }],
  }));
  assert.deepEqual(parsed.issues, []);
});

import { filterTemplateFillFieldsToControls, selectSafeTemplateFills } from "../src/ai/template-fill.ts";

test("template fill application keeps only non-null values for controls that actually exist", () => {
  const safe = selectSafeTemplateFills(
    [
      { id: 1, tag: "TEN_KHACH_HANG", title: "Tên khách hàng" },
      { id: 2, tag: "SO_HO_SO", title: "Số hồ sơ" },
    ],
    [
      { tag: "TEN_KHACH_HANG", value: "Công ty ABC", confidence: 0.9, source: "ABC" },
      { tag: "SO_HO_SO", value: null, confidence: 0, source: "" },
      { tag: "TAG_KHONG_TON_TAI", value: "Không được ghi", confidence: 1, source: "x" },
    ],
  );
  assert.deepEqual(safe, [{ tag: "TEN_KHACH_HANG", value: "Công ty ABC" }]);
});

test("template fill preview keeps only unique fields that exist in Word", () => {
  const fields = filterTemplateFillFieldsToControls(
    [{ id: 1, tag: "TEN_KHACH_HANG", title: "Tên khách hàng" }],
    [
      { tag: "TEN_KHACH_HANG", value: "Công ty ABC", confidence: 0.9, source: "ABC" },
      { tag: "TAG_KHONG_TON_TAI", value: "Không được hiển thị", confidence: 1, source: "x" },
      { tag: "TEN_KHACH_HANG", value: "Giá trị trùng", confidence: 0.5, source: "y" },
    ],
  );
  assert.deepEqual(fields.map((field) => field.value), ["Công ty ABC"]);
});

test("AI uses Ribbon commands and Office Dialogs instead of a user-facing Task Pane", () => {
  assert.equal(manifest.includes('<Action xsi:type="ShowTaskpane">'), false);
  assert.match(manifest, /id="SmartDraftingButton"[\s\S]*?<Action xsi:type="ExecuteFunction"><FunctionName>openSmartDraftingDialog<\/FunctionName>/);
  assert.match(manifest, /id="LearnExperienceButton"[\s\S]*?<Label resid="LearnExperience\.Label"\/>[\s\S]*?<FunctionName>openLearnExperienceDialog<\/FunctionName>/);
  assert.match(manifest, /id="SettingsButton"[\s\S]*?<Action xsi:type="ExecuteFunction"><FunctionName>openSettingsDialog<\/FunctionName>/);
  assert.match(manifest, /id="ItemCheckDocument"[\s\S]*?<Action xsi:type="ExecuteFunction"><FunctionName>openInspectorDialog<\/FunctionName>/);
  assert.match(manifest, /id="TemplateLibraryButton"[\s\S]*?<Action xsi:type="ExecuteFunction"><FunctionName>openTemplateLibraryDialog<\/FunctionName>/);
  assert.match(manifest, /id="TemplateWizardButton"[\s\S]*?<Action xsi:type="ExecuteFunction"><FunctionName>openTemplateWizardDialog<\/FunctionName>/);
  assert.match(manifest, /<Group id="GroupAi">[\s\S]*?<Group id="GroupDocument">[\s\S]*?<Group id="GroupQuickInsert">[\s\S]*?<Group id="GroupLayout">/);
});

test("FINAL prompt keeps every message in the current chat and spells out organizations", () => {
  const history = Array.from({ length: 12 }, (_, index) => ({ role: index % 2 ? "assistant" as const : "user" as const, content: `lượt-${index}` }));
  const prompt = buildWritingPrompt({ input: "soạn công văn", style: "administrative", history });
  assert.match(prompt, /lượt-0/);
  assert.match(prompt, /lượt-11/);
  assert.match(prompt, /VIỆN CƠ KHÍ NĂNG LƯỢNG VÀ MỎ - VINACOMIN/);
  assert.match(prompt, /TRUNG TÂM THỬ NGHIỆM - KIỂM ĐỊNH CÔNG NGHIỆP/);
  assert.doesNotMatch(prompt, /\b(?:IEMM|TVCI)\b/);
});

