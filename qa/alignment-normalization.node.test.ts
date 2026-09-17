import test from "node:test";
import assert from "node:assert/strict";
import { normalizeWordAlignment } from "../src/word/alignment-normalization.ts";

test("normalizes Office alignment strings including Mixed and Unknown", () => {
  assert.equal(normalizeWordAlignment("Left"), "Left");
  assert.equal(normalizeWordAlignment("Centered"), "Centered");
  assert.equal(normalizeWordAlignment("Right"), "Right");
  assert.equal(normalizeWordAlignment("Justified"), "Justified");
  assert.equal(normalizeWordAlignment("Mixed"), "Left");
  assert.equal(normalizeWordAlignment("Unknown"), "Left");
});
