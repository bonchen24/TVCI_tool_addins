import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

test("paragraph validator narrows validated fields so boolean-only rules do not enter scalar issue helper", () => {
  const source = fs.readFileSync("src/rules/validator.ts", "utf8");
  assert.doesNotMatch(source, /const fields:\s*\(keyof ParagraphRules\)\[\]/);
  assert.match(source, /as const/);
});
