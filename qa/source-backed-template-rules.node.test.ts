import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, readFileSync, realpathSync } from "node:fs";
import path from "node:path";
import JSZip from "jszip";
import { TEMPLATE_CATALOG } from "../src/templates/catalog.ts";
import { ADMINISTRATIVE_TEMPLATES } from "../web_app/src/templates/catalog.ts";
import { searchTemplates } from "../src/templates/library.ts";

const sha256 = (bytes: Buffer) => createHash("sha256").update(bytes).digest("hex");
const repoPath = (...parts: string[]) => path.resolve(process.cwd(), ...parts);
function assertCanonicalRepoPath(canonicalPath: string, id: string): string {
  assert.match(canonicalPath.replaceAll("\\", "/"), /^\/?(?:canonical_templates\/|templates\/canonical\/)(?!.*(?:^|\/)\.\.(?:\/|$)).+\.docx$/i, id + " canonical path is outside a protected source root");
  const repository = realpathSync(repoPath("."));
  const resolved = realpathSync(canonicalPath);
  const isWithin = (parent: string, child: string) => {
    const relative = path.relative(parent, child);
    return relative !== "" && relative !== ".." && !relative.startsWith(".." + path.sep) && !path.isAbsolute(relative);
  };
  assert.ok(isWithin(repository, resolved), id + " canonical DOCX resolves outside the repository");
  const roots = ["canonical_templates", path.join("templates", "canonical")];
  const allowed = roots.some((relativeRoot) => {
    const absoluteRoot = repoPath(relativeRoot);
    return existsSync(absoluteRoot) && isWithin(realpathSync(absoluteRoot), resolved);
  });
  assert.ok(allowed, id + " canonical DOCX resolves outside a protected canonical root");
  return resolved;
}
const WORD_NS = "http://schemas.openxmlformats.org/wordprocessingml/2006/main";

function unwrapContentControls(xml: string): string {
  const tokens = xml.match(/<[^>]+>|[^<]+/g) ?? [];
  let propertiesDepth = 0;
  const result: string[] = [];
  for (const token of tokens) {
    if (propertiesDepth > 0) {
      if (/^<\//.test(token) && /w:sdtPr\s*>$/.test(token)) propertiesDepth = 0;
      else if (/^<[^!?/][^>]*>$/.test(token) && !/\/>$/.test(token)) propertiesDepth += 1;
      else if (/^<\//.test(token)) propertiesDepth -= 1;
      continue;
    }
    if (/^<w:sdtPr(?:\s|>)/.test(token)) {
      propertiesDepth = /\/>$/.test(token) ? 0 : 1;
      continue;
    }
    if (/^<\/?w:sdt(?:\s|>)/.test(token) || /^<\/?w:sdtContent(?:\s|>)/.test(token)) continue;
    result.push(token);
  }
  return result.join("");
}

async function compareDocxPackages(canonicalBytes: Buffer, runtimeBytes: Buffer, mode: "byte-exact" | "content-controls-only"): Promise<void> {
  if (mode === "byte-exact") {
    assert.deepEqual(runtimeBytes, canonicalBytes, "byte-exact runtime package differs from canonical bytes");
    return;
  }

  const [canonical, runtime] = await Promise.all([
    JSZip.loadAsync(canonicalBytes),
    JSZip.loadAsync(runtimeBytes),
  ]);
  const canonicalNames = Object.keys(canonical.files).filter((name) => !canonical.files[name].dir).sort();
  const runtimeNames = Object.keys(runtime.files).filter((name) => !runtime.files[name].dir).sort();
  assert.deepEqual(runtimeNames, canonicalNames, "DOCX package parts differ");
  for (const name of canonicalNames) {
    const expected = await canonical.file(name)!.async("nodebuffer");
    const actual = await runtime.file(name)!.async("nodebuffer");
    if (name !== "word/document.xml") {
      assert.deepEqual(actual, expected, `DOCX package part ${name} differs`);
      continue;
    }
    const expectedXml = expected.toString("utf8");
    const actualXml = actual.toString("utf8");
    assert.match(expectedXml, /xmlns:w=/, "canonical Word document XML has no w namespace");
    assert.match(actualXml, /xmlns:w=/, "runtime Word document XML has no w namespace");
    assert.equal(unwrapContentControls(actualXml), unwrapContentControls(expectedXml), "WordprocessingML differs beyond w:sdt wrappers");
  }
}

test("built-in catalog records carry hashes that match their actual runtime DOCX files", async () => {
  for (const record of TEMPLATE_CATALOG) {
    assert.ok(record.verification, `${record.id} has no verification record`);
    assert.equal(record.verification.runtime.path, record.source.path, `${record.id} runtime path mismatch`);
    assert.match(record.verification.runtime.sha256 ?? "", /^[a-f0-9]{64}$/, `${record.id} has no runtime SHA-256`);

    const relativePath = record.source.path.replace(/^\/+/, "");
    const runtimePath = repoPath(relativePath);
    const distPath = repoPath("dist", relativePath);
    const runtimeBytes = readFileSync(runtimePath);
    const distBytes = readFileSync(distPath);
    assert.equal(sha256(runtimeBytes), record.verification.runtime.sha256, `${record.id} runtime fingerprint changed`);
    assert.deepEqual(distBytes, runtimeBytes, `${record.id} dist runtime differs from its source asset`);

    if (record.verification.status === "verified") {
      const canonical = record.verification.canonicalSource;
      assert.ok(canonical, `${record.id} is verified without a canonical source`);
      assert.match(canonical.sha256, /^[a-f0-9]{64}$/, `${record.id} canonical SHA-256 is invalid`);
      const canonicalPath = assertCanonicalRepoPath(repoPath(canonical.path.replace(/^\/+/, "")), record.id);
      const canonicalBytes = readFileSync(canonicalPath);
      assert.equal(sha256(canonicalBytes), canonical.sha256, `${record.id} canonical fingerprint changed`);
      assert.equal(record.verification.runtime.derivedFromCanonicalSha256, canonical.sha256);
      const runtimeBytes = readFileSync(runtimePath);
      const comparison = record.verification.runtime.comparison;
      assert.ok(comparison === "byte-exact" || comparison === "content-controls-only", `${record.id} has no declared comparison policy`);
      await compareDocxPackages(canonicalBytes, runtimeBytes, comparison);
    }
  }
});

test("web catalog provenance is source-backed and missing canonical DOCX keeps apply closed", async () => {
  for (const record of ADMINISTRATIVE_TEMPLATES) {
    const verification = record.verification;
    const runtimePath = "/templates/" + record.fileName;
    assert.equal(verification.runtime.path, runtimePath, record.id + " runtime path mismatch");
    const runtimeFile = repoPath(runtimePath.replace(/^\/+/, ""));
    const distFile = repoPath("dist", runtimePath.replace(/^\/+/, ""));
    if (!existsSync(runtimeFile)) {
      assert.equal(verification.runtime.sha256, null, record.id + " hashes a missing runtime file");
      assert.notEqual(verification.status, "verified", record.id + " verifies a missing runtime file");
    } else {
      const runtimeBytes = readFileSync(runtimeFile);
      assert.equal(sha256(runtimeBytes), verification.runtime.sha256, record.id + " runtime fingerprint changed");
      if (existsSync(distFile)) {
        assert.deepEqual(readFileSync(distFile), runtimeBytes, record.id + " dist runtime differs from its source asset");
      }
    }

    if (verification.status === "verified") {
      const canonical = verification.canonicalSource;
      assert.ok(canonical, record.id + " is verified without a canonical source");
      assert.match(canonical.path.replaceAll("\\", "/"), /^\/?(?:canonical_templates\/|templates\/canonical\/)(?!.*(?:^|\/)\.\.(?:\/|$)).+\.docx$/i);
      const canonicalFile = repoPath(canonical.path.replace(/^\/+/, ""));
      assert.ok(existsSync(canonicalFile), record.id + " canonical DOCX is missing");
      const canonicalBytes = readFileSync(assertCanonicalRepoPath(canonicalFile, record.id));
      assert.equal(sha256(canonicalBytes), canonical.sha256, record.id + " canonical fingerprint changed");
      assert.equal(verification.runtime.derivedFromCanonicalSha256, canonical.sha256);
      const comparison = verification.runtime.comparison;
      assert.ok(comparison === "byte-exact" || comparison === "content-controls-only");
      await compareDocxPackages(canonicalBytes, readFileSync(runtimeFile), comparison);
    } else {
      assert.equal(verification.canonicalSource, null, record.id + " has an unverified canonical claim");
    }
  }
});

test("content-controls-only package comparison permits only w:sdt wrappers", async () => {
  const canonical = new JSZip();
  const runtime = new JSZip();
  const canonicalXml = `<w:document xmlns:w="${WORD_NS}"><w:body><w:p><w:r><w:t>Text</w:t></w:r></w:p></w:body></w:document>`;
  const runtimeXml = `<w:document xmlns:w="${WORD_NS}"><w:body><w:p><w:sdt><w:sdtPr><w:tag w:val="FIELD"/></w:sdtPr><w:sdtContent><w:r><w:t>Text</w:t></w:r></w:sdtContent></w:sdt></w:p></w:body></w:document>`;
  canonical.file("word/document.xml", canonicalXml);
  runtime.file("word/document.xml", runtimeXml);
  canonical.file("word/styles.xml", "same styles");
  runtime.file("word/styles.xml", "same styles");
  await compareDocxPackages(
    await canonical.generateAsync({ type: "nodebuffer" }),
    await runtime.generateAsync({ type: "nodebuffer" }),
    "content-controls-only",
  );
  runtime.file("word/styles.xml", "changed styles");
  await assert.rejects(compareDocxPackages(
    await canonical.generateAsync({ type: "nodebuffer" }),
    await runtime.generateAsync({ type: "nodebuffer" }),
    "content-controls-only",
  ), /word\/styles\.xml differs/);
});

test("unverified and quarantined bundled records never appear in normal template search", () => {
  const productionResults = searchTemplates(TEMPLATE_CATALOG, {});
  assert.ok(
    productionResults.every((record) => record.source.kind === "user" || record.verification?.status === "verified"),
    "normal search returned a bundled template without verified provenance",
  );
});

test("generic sample records are quarantined and excluded from official search", () => {
  const sampleIds = ["dang-sample-001", "tvci-sample-001", "iemm-sample-001"];
  for (const id of sampleIds) {
    const record = TEMPLATE_CATALOG.find((item) => item.id === id);
    assert.ok(record, `Missing ${id}`);
    assert.equal(record.verification?.status, "quarantined", `${id} must be quarantined`);
    assert.equal(searchTemplates([record], {}).length, 0, `${id} leaked into normal search`);
  }
});
