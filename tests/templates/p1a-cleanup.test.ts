import { readFileSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { makeUserTemplateRecord, updateUserTemplateRecord } from "../../src/templates/user-template";
import { searchTemplates, type TemplateRecord } from "../../src/templates/library";
import { validateTemplateCandidate } from "../../src/templates/template-validator";

const root = resolve(__dirname, "../../src");

function sourceFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? sourceFiles(path) : /\.(?:ts|tsx)$/.test(entry.name) ? [path] : [];
  });
}

function template(overrides: Partial<TemplateRecord> = {}): TemplateRecord {
  return {
    id: "legacy-template",
    name: "Mẫu văn bản",
    organization: "TVCI",
    department: "Phòng Kỹ thuật",
    documentType: "Công văn",
    keywords: ["hành chính"],
    source: { kind: "user", storageId: "legacy-template" },
    version: "1.0",
    status: "active",
    ...overrides,
  };
}

describe("P1-A template and text-entry cleanup", () => {
  test("template library and wizard do not expose department controls or labels", () => {
    const library = readFileSync(resolve(root, "taskpane/components/TemplateLibraryModal.tsx"), "utf8");
    const wizard = readFileSync(resolve(root, "taskpane/components/TemplateWizardModal.tsx"), "utf8");

    for (const source of [library, wizard]) {
      expect(source).not.toContain("department");
      expect(source).not.toContain("Phòng ban");
      expect(source).not.toContain("Bộ phận");
    }
  });

  test("new user templates default department internally without user input", () => {
    const record = makeUserTemplateRecord({
      name: "Mẫu không chọn đơn vị phụ trách",
      organization: "TVCI",
      documentType: "Công văn",
      keywords: "kiểm định",
    }, "new-template", "2026-09-21T00:00:00.000Z");

    expect(record.department).toBe("Dùng chung");
    expect(validateTemplateCandidate({
      name: record.name,
      organization: record.organization,
      documentType: record.documentType,
      fields: [],
    }).valid).toBe(true);
  });

  test("legacy department data remains intact when metadata is edited", () => {
    const legacy = template();
    const updated = updateUserTemplateRecord(legacy, {
      name: "Mẫu đã đổi tên",
      documentType: "Báo cáo",
      version: "2.0",
      keywords: "báo cáo",
      description: "Mô tả mới",
    }, "2026-09-21T00:00:00.000Z");

    expect(updated.department).toBe("Phòng Kỹ thuật");
    expect(updated.id).toBe(legacy.id);
    expect(updated.source).toEqual(legacy.source);
  });

  test("user-facing search returns records across legacy departments", () => {
    const records = [
      template({ id: "a", department: "Phòng Kỹ thuật" }),
      template({ id: "b", department: "Văn phòng" }),
    ];

    expect(searchTemplates(records, { query: "mẫu văn bản" }).map((record) => record.id)).toEqual(["a", "b"]);
    expect(searchTemplates(records, { query: "phòng kỹ thuật" })).toEqual([]);
  });

  test("all source text-entry flows avoid browser prompts and use in-app controls", () => {
    const sources = sourceFiles(root).map((path) => readFileSync(path, "utf8")).join("\n");
    expect(sources).not.toMatch(/window\.prompt\s*\(/);

    const metadataEditor = readFileSync(resolve(root, "taskpane/components/TemplateMetadataEditor.tsx"), "utf8");
    const aiView = readFileSync(resolve(root, "taskpane/components/AiTaskpaneView.tsx"), "utf8");
    const aiSettings = readFileSync(resolve(root, "taskpane/components/AiSettingsModal.tsx"), "utf8");
    expect(metadataEditor).toContain("onSave");
    expect(metadataEditor).toContain("Từ khóa");
    expect(aiView).toContain("onRenameConversation");
    expect(aiView).toContain("Đổi tên");
    expect(aiSettings).toContain("Model id tùy chọn");
  });
});
