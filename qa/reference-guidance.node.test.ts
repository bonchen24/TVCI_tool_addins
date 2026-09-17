import test from "node:test";
import assert from "node:assert/strict";
import { QUICK_GUIDANCE, searchQuickGuidance } from "../src/reference/quick-guidance.ts";

test("quick guidance includes source-backed IEMM/TVCCI drafting rules", () => {
  const text = QUICK_GUIDANCE.map((item) => `${item.title} ${item.content}`).join(" ");
  assert.match(text, /VCNM-TTTN/);
  assert.match(text, /không lấy số văn bản/i);
  assert.match(text, /Times New Roman/i);
  assert.match(text, /Nơi nhận/i);
});

test("quick guidance search accepts Vietnamese queries without diacritics", () => {
  const results = searchQuickGuidance(QUICK_GUIDANCE, "to trinh noi bo");
  assert.equal(results.some((item) => /Tờ trình nội bộ/.test(item.title)), true);
});
