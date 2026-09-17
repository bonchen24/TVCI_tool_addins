import test from "node:test";
import assert from "node:assert/strict";
import { applyProofreadingIssueToText, applySafeProofreadingIssues } from "../src/ai/proofreading-actions.ts";

const issues = [
  { category: "spelling" as const, original: "bổ xung", suggestion: "bổ sung", explanation: "Sai chính tả" },
  { category: "punctuation" as const, original: "Kính gửi Công ty ABC", suggestion: "Kính gửi: Công ty ABC", explanation: "Thiếu dấu hai chấm" },
  { category: "administrative_style" as const, original: "bên em", suggestion: "Trung tâm", explanation: "Văn phong" },
];

test("applies one proofreading issue without rewriting unrelated text", () => {
  assert.equal(applyProofreadingIssueToText("Đề nghị bổ xung hồ sơ.", issues[0]), "Đề nghị bổ sung hồ sơ.");
});

test("safe fix applies spelling/grammar/capitalization/punctuation but not administrative style", () => {
  const text = "Kính gửi Công ty ABC. Đề nghị bổ xung hồ sơ, bên em sẽ xử lý.";
  const result = applySafeProofreadingIssues(text, issues);
  assert.match(result, /Kính gửi: Công ty ABC/);
  assert.match(result, /bổ sung/);
  assert.match(result, /bên em/);
});
