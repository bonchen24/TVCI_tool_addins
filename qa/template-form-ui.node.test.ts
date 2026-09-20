import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("template form UI is extracted into FormDraftingView with actions", async () => {
  const app = await readFile(new URL("../src/taskpane/App.tsx", import.meta.url), "utf8");
  const modal = await readFile(new URL("../src/taskpane/components/TemplateFormModal.tsx", import.meta.url), "utf8");
  const formView = await readFile(new URL("../src/taskpane/components/FormDraftingView.tsx", import.meta.url), "utf8");
  assert.match(app, /<TemplateFormModal/);
  assert.match(modal, /role="dialog" aria-modal="true"/);
  assert.match(formView, /onInsertBlank/);
  assert.match(formView, /onInsertAndFill/);
  assert.match(formView, /onApplyToWord/);
});

test("template form UI keeps AI suggestions out of Word until acceptance", async () => {
  const source = await readFile(new URL("../src/taskpane/components/FormDraftingView.tsx", import.meta.url), "utf8");
  assert.match(source, /onAcceptAi/);
  assert.match(source, /onApplyToWord/);
  assert.match(source, /onSuggestAi/);
});

test("template form surface organizes approved organizations", async () => {
  const catalog = await readFile(new URL("../src/templates/catalog.ts", import.meta.url), "utf8");
  assert.match(catalog, /TVCI/);
  assert.match(catalog, /IEMM/);
  assert.match(catalog, /DANG/);
});

test("template library modal allows filtering and opening form modal", async () => {
  const app = await readFile(new URL("../src/taskpane/App.tsx", import.meta.url), "utf8");
  const libModal = await readFile(new URL("../src/taskpane/components/TemplateLibraryModal.tsx", import.meta.url), "utf8");
  assert.match(app, /<TemplateLibraryModal/);
  assert.match(libModal, /onOpenForm/);
  assert.match(libModal, /onDirectInsert/);
});

