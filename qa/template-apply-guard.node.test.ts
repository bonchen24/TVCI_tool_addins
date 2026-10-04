import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (name: string) => readFileSync(path.join(root, name), "utf8");

function handlerSource(source: string, name: string): string {
  const start = source.indexOf(`const ${name} =`);
  assert.notEqual(start, -1, `missing ${name}`);
  const nextHandler = source.indexOf("\n  const ", start + 1);
  return source.slice(start, nextHandler === -1 ? undefined : nextHandler);
}

test("Office form open, form apply, and template AI fill recheck the selected record", () => {
  const app = read("src/taskpane/App.tsx");
  for (const name of ["handleOpenTemplateForm", "handleApplyTemplateForm", "handleConfirmPendingApply", "handleApplyTemplateFill"]) {
    const handler = handlerSource(app, name);
    assert.match(handler, /isTemplateSelectable\(/, `${name} does not enforce template selection policy`);
  }

  const dialog = read("src/commands/dialog.ts");
  const formApply = dialog.slice(dialog.indexOf('data.type === "apply_template_form"'));
  assert.match(formApply, /isTemplateSelectable\(data\.template\)/);
});

test("web AI fill and insert validate provenance before changing editor content or calling the parent", () => {
  const ai = read("web_app/src/components/ai/AiWorkspacePanel.tsx");
  for (const name of ["handleApplyTemplateFill", "handleInsertFullTemplateDoc"]) {
    const handler = handlerSource(ai, name);
    const check = handler.search(/requireVerifiedTemplate\(/);
    assert.notEqual(check, -1, `${name} does not resolve a verified catalog template`);
    const editorChange = handler.search(/applyTemplateFieldsToEditor\(|commands\.setContent\(|onApplyTemplate\(/);
    assert.ok(check < editorChange, `${name} mutates or applies before the provenance check`);
  }
});
