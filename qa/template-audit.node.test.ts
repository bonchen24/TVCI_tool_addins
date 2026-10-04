import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { TEMPLATE_CATALOG } from "../src/templates/catalog.ts";
import { ADMINISTRATIVE_TEMPLATES } from "../web_app/src/templates/catalog.ts";

const repoRoot = process.cwd();
const sha256 = (bytes: Buffer) => createHash("sha256").update(bytes).digest("hex");
const fromRepo = (runtimePath: string) => path.join(repoRoot, runtimePath.replace(/^\/+/, ""));
const cells = (row: string) => row.split("|").slice(1, -1).map((value) => value.trim());

function listRuntimeDocx(directory: string, relative = ""): string[] {
  if (!existsSync(directory)) return [];
  const files: string[] = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if (entry.isDirectory() && entry.name.toLowerCase() === "canonical") continue;
    const absolute = path.join(directory, entry.name);
    const childRelative = path.join(relative, entry.name);
    if (entry.isDirectory()) files.push(...listRuntimeDocx(absolute, childRelative));
    else if (entry.isFile() && entry.name.toLowerCase().endsWith(".docx")) {
      files.push("/templates/" + childRelative.replaceAll("\\", "/"));
    }
  }
  return files;
}

test("both catalogs expose accurate provenance and runtime evidence without metadata-only verification", () => {
  assert.equal(TEMPLATE_CATALOG.length, 22);
  assert.equal(ADMINISTRATIVE_TEMPLATES.length, 22);

  let missingWebRuntimePaths = 0;
  const catalogs = [
    {
      name: "Office",
      records: TEMPLATE_CATALOG.map((record) => ({
        ...record,
        documentType: record.documentType,
        canonicalSource: record.verification?.canonicalSource ?? null,
        verification: record.verification!,
        expectedReferences: record.referenceSources?.length ? record.referenceSources.join("; ") : "None recorded in catalog",
      })),
    },
    {
      name: "Web app",
      records: ADMINISTRATIVE_TEMPLATES.map((record) => ({
        ...record,
        documentType: record.vietnameseCategory,
        canonicalSource: record.verification.canonicalSource,
        expectedReferences: "None recorded in web catalog",
        verification: record.verification,
      })),
    },
  ] as const;

  for (const catalog of catalogs) {
    for (const record of catalog.records) {
      assert.ok(record.verification, catalog.name + ":" + record.id + " has no provenance record");
      const expectedRuntimePath = catalog.name === "Office"
        ? record.source.path
        : "/templates/" + record.fileName;
      assert.equal(record.verification.runtime.path, expectedRuntimePath, catalog.name + ":" + record.id + " runtime mapping differs");

      const absoluteRuntimePath = fromRepo(expectedRuntimePath);
      const exists = existsSync(absoluteRuntimePath);
      if (catalog.name === "Web app" && !exists) missingWebRuntimePaths += 1;
      if (!exists) {
        assert.equal(record.verification.runtime.sha256, null, catalog.name + ":" + record.id + " hashes a missing runtime file");
        assert.notEqual(record.verification.status, "verified", catalog.name + ":" + record.id + " verifies a missing runtime file");
      } else {
        const actualHash = sha256(readFileSync(absoluteRuntimePath));
        assert.equal(record.verification.runtime.sha256, actualHash, catalog.name + ":" + record.id + " runtime hash mismatch");
      }

      assert.equal(record.verification.canonicalSource, null, catalog.name + ":" + record.id + " has no exact canonical source");
      assert.notEqual(record.verification.status, "verified", catalog.name + ":" + record.id + " is verified without an exact canonical DOCX");
    }
  }

  assert.equal(missingWebRuntimePaths, 14, "web catalog must report its 14 missing IEMM runtime files");
  assert.deepEqual(
    [
      TEMPLATE_CATALOG.filter((item) => item.verification?.status === "verified").length,
      TEMPLATE_CATALOG.filter((item) => item.verification?.status === "unverified").length,
      TEMPLATE_CATALOG.filter((item) => item.verification?.status === "quarantined").length,
    ],
    [0, 19, 3],
  );
  assert.deepEqual(
    [
      ADMINISTRATIVE_TEMPLATES.filter((item) => item.verification.status === "verified").length,
      ADMINISTRATIVE_TEMPLATES.filter((item) => item.verification.status === "unverified").length,
      ADMINISTRATIVE_TEMPLATES.filter((item) => item.verification.status === "quarantined").length,
    ],
    [0, 20, 2],
  );
});

test("audit rows reproduce catalog identity, type, paths, references, status, reason, and actions", () => {
  const audit = readFileSync(path.join(repoRoot, "docs", "template-audit.md"), "utf8");
  const auditLines = audit.split(/\r?\n/);
  const header = auditLines.find((line) => line.startsWith("| Catalog | ID |"));
  assert.equal(
    header,
    "| Catalog | ID | Name | Organization | Document type | Runtime path | Canonical source | Reference sources | Runtime exists? | Runtime SHA-256 | Verification status | Reason | Action |",
  );
  const auditTableHeader = auditLines.findIndex((line) => line === header);
  const rows = new Map(
    auditLines
      .slice(auditTableHeader + 2)
      .filter((line) => line.startsWith("| Office |") || line.startsWith("| Web app |"))
      .map((line) => {
        const values = cells(line);
        return [values[0] + ":" + values[1], values];
      }),
  );

  const records = [
    ...TEMPLATE_CATALOG.map((record) => ({
      catalog: "Office",
      id: record.id,
      name: record.name,
      organization: record.organization,
      documentType: record.documentType,
      runtimePath: record.verification!.runtime.path,
      references: record.referenceSources?.length ? record.referenceSources.join("; ") : "None recorded in catalog",
      verification: record.verification!,
    })),
    ...ADMINISTRATIVE_TEMPLATES.map((record) => ({
      catalog: "Web app",
      id: record.id,
      name: record.name,
      organization: record.organization,
      documentType: record.vietnameseCategory,
      runtimePath: record.verification.runtime.path,
      references: "None recorded in web catalog",
      verification: record.verification,
    })),
  ];

  assert.equal(rows.size, 44);
  for (const record of records) {
    const row = rows.get(record.catalog + ":" + record.id);
    assert.ok(row, "audit is missing " + record.catalog + ":" + record.id);
    const actualRuntimePath = fromRepo(record.runtimePath);
    const exists = existsSync(actualRuntimePath);
    assert.equal(row[2], record.name);
    assert.equal(row[3], record.organization);
    assert.equal(row[4], record.documentType);
    assert.equal(row[5], record.runtimePath);
    assert.equal(row[6], record.verification.canonicalSource ? record.verification.canonicalSource.name + "; " + record.verification.canonicalSource.path + "; SHA-256 " + record.verification.canonicalSource.sha256 : "None recorded");
    assert.equal(row[7], record.references);
    assert.equal(row[8], exists ? "Yes" : "No");
    assert.equal(row[9], exists ? sha256(readFileSync(actualRuntimePath)) : "None");
    assert.equal(row[10], record.verification.status);
    assert.equal(row[11], record.verification.reason);
    assert.ok(row[12].length > 0, "audit has no next action for " + record.catalog + ":" + record.id);
  }

  assert.ok(audit.includes("| Combined audit rows | 44 | 0 | 39 | 5 | 14 |"));
  assert.ok(audit.includes("No canonical DOCX files are present in canonical_templates/ or templates/canonical/."));
});

test("runtime asset inventory matches the filesystem and current dist copies", () => {
  const auditLines = readFileSync(path.join(repoRoot, "docs", "template-audit.md"), "utf8").split(/\r?\n/);
  const assetRows = auditLines.filter((line) => /^\| \/templates\/.*\.docx \|/.test(line)).map(cells);
  const actualPaths = listRuntimeDocx(path.join(repoRoot, "templates")).sort();
  assert.deepEqual(assetRows.map((row) => row[0]).sort(), actualPaths);

  for (const row of assetRows) {
    const runtimePath = fromRepo(row[0]);
    const runtimeBytes = readFileSync(runtimePath);
    assert.equal(row[1], sha256(runtimeBytes), row[0] + " runtime hash mismatch");
    const distPath = path.join(repoRoot, "dist", row[0].replace(/^\/templates\//, "templates/"));
    const expectedDist = existsSync(distPath)
      ? sha256(readFileSync(distPath)) === row[1] ? "Yes; hash matches" : "Present; hash differs"
      : "No";
    assert.equal(row[3], expectedDist, row[0] + " dist status differs");
  }

  assert.ok(assetRows.some((row) => row[0] === "/templates/sample-template.docx" && row[2].includes("Quarantined")));
  assert.ok(readFileSync(path.join(repoRoot, "docs", "template-audit.md"), "utf8").includes("quarantined from catalog, search, and insertion"));
});

test("supplied Drive metadata stays external context and design keeps provenance release-blocking", () => {
  const audit = readFileSync(path.join(repoRoot, "docs", "template-audit.md"), "utf8");
  const normalizedAudit = audit.toLowerCase();
  for (const value of [
    "18KtLmG6n65rUDLaAcslxk_EunQG2xl85",
    "1QixLiN0n_2coMWTakVKF2VjDA1hK5Xok",
    "1j0XbWVFTUzUCmRNIt2a-o7_pSlx1S2Qt",
    "27053eeb9515c5f2287aac811b2a854c8644329a1b53e9ddcf5a875b4468b95d",
    "1hqwE4JeEf9pnlHupr4-t3wiiE7Q26vTJ",
    "50eabc984af468c73c10f8b836b423dd3d60e899acf611dd4d13bfba86d52608",
    "1_l-QPjZMY_rZNZsVSbakL53PD2908rjC",
    "7cc1473da842fb8333800e86cc89e0f93db44e3b1b0e2f8d8257d3a8f40caed5",
    "1d3DEvlmFe9ywjBAezxAhdLWvwxw8EOWA",
    "6ad830fb63e727705bbcb5d5927156abd053baff94dd79fd73bda187f1ed7c84",
    "external source metadata is not verification",
    "source located externally",
  ]) assert.ok(normalizedAudit.includes(value.toLowerCase()), "audit is missing " + value);

  const design = readFileSync(path.join(repoRoot, "design.md"), "utf8");
  assert.match(design, /template correctness.{0,40}provenance.{0,40}release-blocking invariant/i);
  assert.match(design, /regulation.{0,80}canonical form/i);
  assert.match(design, /external source metadata.{0,80}verified/i);
});
