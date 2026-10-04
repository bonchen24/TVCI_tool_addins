import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";

const repoRoot = process.cwd();
const mutatingScripts = [
  "add-template-form-content-controls.py",
  "apply-iemm-header-to-civil-templates.py",
  "normalize-active-template-format.py",
  "normalize-catalog-templates.py",
  "normalize-final-catalog.py",
  "patch-iemm-template-branding.py",
  "repair-header-number-layout.py",
  "repair-template-openxml.py",
  "remove-signer-guidance.py",
  "sanitize-all-templates.py",
  "standardize-templates.py",
  "generate-guide-docx.py",
];

const recursiveMutators = [
  "apply-iemm-header-to-civil-templates.py",
  "normalize-active-template-format.py",
  "repair-header-number-layout.py",
  "repair-template-openxml.py",
  "remove-signer-guidance.py",
  "sanitize-all-templates.py",
  "standardize-templates.py",
];

test("shared guard rejects both canonical roots and filters them from runtime DOCX inputs", () => {
  const scriptsPath = path.join(repoRoot, "scripts").replaceAll("\\", "/");
  const canonicalPaths = [
    path.join(repoRoot, "canonical_templates", "official.docx"),
    path.join(repoRoot, "templates", "canonical", "official.docx"),
  ].map((value) => value.replaceAll("\\", "/"));
  const runtimePath = path.join(repoRoot, "templates", "tvci-cong-van-template.docx").replaceAll("\\", "/");
  const code = [
    "import sys; sys.path.insert(0, " + JSON.stringify(scriptsPath) + ")",
    "from pathlib import Path",
    "from template_path_safety import assert_mutable_runtime_path, filter_runtime_docx",
    "canonical_paths = " + JSON.stringify(canonicalPaths),
    "runtime = " + JSON.stringify(runtimePath),
    "for canonical in canonical_paths:",
    "    try:",
    "        assert_mutable_runtime_path(canonical)",
    "    except ValueError:",
    "        pass",
    "    else:",
    "        raise AssertionError('canonical path was not rejected: ' + canonical)",
    "assert_mutable_runtime_path(runtime)",
    "assert filter_runtime_docx([*canonical_paths, runtime]) == [Path(runtime)]",
  ].join("\n");
  const result = spawnSync("python", ["-c", code], { encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr || result.stdout);
});

test("every DOCX mutator guards its write targets", () => {
  for (const name of mutatingScripts) {
    const source = readFileSync(path.join(repoRoot, "scripts", name), "utf8");
    assert.match(source, /from\s+template_path_safety\s+import[^\n]*assert_mutable_runtime_path/, name + " must import the shared guard");
    assert.match(source, /assert_mutable_runtime_path\s*\(/, name + " must guard a target before writing");
  }
});

test("recursive DOCX mutators filter canonical files and standardizer excludes them from copies", () => {
  for (const name of recursiveMutators) {
    const source = readFileSync(path.join(repoRoot, "scripts", name), "utf8");
    assert.match(source, /filter_runtime_docx\s*\(/, name + " must exclude canonical DOCX files from recursive inputs");
  }

  const standardizer = readFileSync(path.join(repoRoot, "scripts", "standardize-templates.py"), "utf8");
  assert.match(standardizer, /copytree\s*\([\s\S]*?ignore\s*=/, "runtime copy must omit the canonical subtree");
});

test("designated canonical root stays outside runtime trees and nested masters are excluded", () => {
  const canonicalRoot = path.resolve(repoRoot, "canonical_templates");
  for (const runtimeRoot of [path.resolve(repoRoot, "templates"), path.resolve(repoRoot, "dist", "templates")]) {
    const relative = path.relative(runtimeRoot, canonicalRoot);
    assert.ok(relative === ".." || relative.startsWith(".." + path.sep), canonicalRoot + " must stay outside " + runtimeRoot);
  }

  const standardizer = readFileSync(path.join(repoRoot, "scripts", "standardize-templates.py"), "utf8");
  assert.ok(standardizer.includes('ignore=shutil.ignore_patterns("canonical")'), "runtime copy must omit the canonical subtree");

  const webpackConfig = readFileSync(path.join(repoRoot, "webpack.config.js"), "utf8");
  assert.ok(webpackConfig.includes('"**/canonical/**"'), "webpack must not bundle templates/canonical");
});
