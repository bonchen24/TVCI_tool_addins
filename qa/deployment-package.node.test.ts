import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { normalizeBaseUrl, renderProductionManifest } from "../scripts/package-client.mjs";
import {
  inspectCanonicalRibbonManifest,
  ribbonPreservationFingerprint,
} from "../scripts/ribbon-preservation.mjs";

const manifest = fs.readFileSync(path.join("manifest", "manifest.xml"), "utf8");

test("production base URL requires HTTPS and removes the trailing slash", () => {
  assert.equal(normalizeBaseUrl("https://intranet.example/tvci-word-tools/"), "https://intranet.example/tvci-word-tools");
  assert.throws(() => normalizeBaseUrl("http://intranet.example/tvci-word-tools"), /HTTPS/);
});

test("production manifest replaces localhost URLs and keeps AppDomain at the origin", () => {
  const baseUrl = "https://intranet.example/tvci-word-tools";
  const rendered = renderProductionManifest(manifest, baseUrl);
  const expected = manifest
    .replaceAll("https://localhost:38473", baseUrl)
    .replace(
      `<AppDomain>${baseUrl}</AppDomain>`,
      `<AppDomain>${new URL(baseUrl).origin}</AppDomain>`,
    );

  assert.equal(rendered, expected, "production rendering may only rewrite the deployment base URL");
  assert.match(manifest, /https:\/\/localhost:38473/);
  assert.doesNotMatch(rendered, /https:\/\/localhost:38473/);
  assert.match(rendered, /<DefaultSettings><SourceLocation DefaultValue="https:\/\/intranet\.example\/tvci-word-tools\/taskpane\.html"\/>/);
  assert.match(rendered, /<AppDomain>https:\/\/intranet\.example<\/AppDomain>/);
  assert.doesNotMatch(rendered, /<AppDomain>https:\/\/intranet\.example\/tvci-word-tools<\/AppDomain>/);
});

test("production rendering preserves the canonical Ribbon controls and resources", () => {
  const rendered = renderProductionManifest(manifest, "https://intranet.example/tvci-word-tools");
  assert.deepEqual(
    inspectCanonicalRibbonManifest(rendered),
    inspectCanonicalRibbonManifest(manifest),
  );
  assert.equal(
    ribbonPreservationFingerprint(rendered),
    ribbonPreservationFingerprint(manifest),
  );
});

test("package script is exposed for client distribution", () => {
  const packageJson = JSON.parse(fs.readFileSync("package.json", "utf8")) as { scripts: Record<string, string> };
  assert.match(packageJson.scripts["package:client"] ?? "", /npm run build/);
  assert.match(packageJson.scripts["package:client"] ?? "", /package-client\.mjs/);
});
