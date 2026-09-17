import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { TEMPLATE_CATALOG } from "../src/templates/catalog.ts";
import { getTemplateFormSchema } from "../src/templates/form-schema.ts";

const require = createRequire(import.meta.url);
const AdmZip = require("adm-zip");

test("core DOCX packages expose schema Content Controls and preserve layout controls", () => {
  const core = TEMPLATE_CATALOG.filter((item) => ["IEMM", "TVCI", "DANG"].includes(item.organization));
  for (const template of core) {
    if (template.source.kind !== "bundled") continue;
    const filePath = path.resolve(template.source.path.slice(1));
    assert.equal(fs.existsSync(filePath), true, filePath);
    const zip = new AdmZip(filePath);
    const xml = zip.getEntries()
      .filter((entry: { entryName: string }) => entry.entryName.startsWith("word/") && entry.entryName.endsWith(".xml"))
      .map((entry: { getData: () => Buffer }) => entry.getData().toString("utf8"))
      .join("\n");
    const schema = getTemplateFormSchema(template);
    assert.ok(schema, template.id);
    const tags = [...xml.matchAll(/<w:tag w:val="([^"]+)"/g)].map((match) => match[1]);
    for (const field of schema.fields.filter((field) => field.wordTarget === "content-control")) {
      assert.equal(tags.filter((tag) => tag === field.tag).length, 1, `${template.id} missing/excess ${field.tag}`);
    }
    assert.match(xml, /TVCI_HRULE:/, `${template.id} must retain layout controls`);
  }
});
