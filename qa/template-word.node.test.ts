import test from "node:test";
import assert from "node:assert/strict";
import { prepareContentControlTarget } from "../src/word/content-control-target.ts";

test("prepares AI field target for safe Word search", () => {
  assert.deepEqual(prepareContentControlTarget("  Công ty ABC  ", "ten_khach_hang", " Tên khách hàng "), {
    sourceText: "Công ty ABC",
    tag: "TEN_KHACH_HANG",
    title: "Tên khách hàng",
  });
});

test("rejects empty source text before Word search", () => {
  assert.throws(() => prepareContentControlTarget(" ", "TEN_KHACH_HANG", "Tên khách hàng"), /văn bản nguồn/i);
});
