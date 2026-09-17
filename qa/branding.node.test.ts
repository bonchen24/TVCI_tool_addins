import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { ADDIN_BRANDING } from "../src/branding.ts";

const repoRoot = process.cwd();

test("branding exposes institute title lines and developer credit", () => {
  assert.deepEqual(ADDIN_BRANDING.titleLines, [
    "VIỆN CƠ KHÍ NĂNG LƯỢNG VÀ MỎ - VINACOMIN",
    "TRUNG TÂM THỬ NGHIỆM - KIỂM ĐỊNH CÔNG NGHIỆP",
  ]);
  assert.match(ADDIN_BRANDING.developerCredit, /Lương Xuân Hùng/);
  assert.equal(ADDIN_BRANDING.developerCredit, "Mọi yêu cầu hoàn thiện app xin gửi Lương Xuân Hùng - 0983565139");
});

test("branding logo assets exist in bundled assets folder", () => {
  const iemmPath = path.join(repoRoot, ADDIN_BRANDING.logos.iemm.replace(/^\//, ""));
  const tvciPath = path.join(repoRoot, ADDIN_BRANDING.logos.tvci.replace(/^\//, ""));
  assert.equal(fs.existsSync(iemmPath), true);
  assert.equal(fs.existsSync(tvciPath), true);
  for (const size of [16, 32, 80]) {
    const badge = fs.readFileSync(path.join(repoRoot, `assets/ribbon/icon-brand-badge-${size}.png`));
    assert.deepEqual([...badge.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10]);
  }
});
