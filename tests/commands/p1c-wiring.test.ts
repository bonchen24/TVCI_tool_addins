import fs from "node:fs";
import path from "node:path";

const root = path.resolve(__dirname, "../..");
const appSource = fs.readFileSync(path.join(root, "src/taskpane/App.tsx"), "utf8");
const dialogSource = fs.readFileSync(path.join(root, "src/commands/dialog.ts"), "utf8");
const inspectionSource = fs.readFileSync(path.join(root, "src/taskpane/components/InspectionModal.tsx"), "utf8");

describe("P1-C settings and Inspector wiring", () => {
  it("bridges AI clear from the dialog and subscribes the Task Pane to fresh settings", () => {
    expect(appSource).toContain('JSON.stringify({ type: "ai_settings_cleared" })');
    expect(appSource).toContain("subscribeToAiSettings");
    expect(dialogSource).toContain('if (data.type === "ai_settings_cleared")');
    expect(dialogSource).toContain("applyAiSettingsClearedMessage");
    expect(dialogSource).not.toContain('logDialog("DialogMessageReceived", { raw });');
  });

  it("handles save_settings_default in the parent without applying settings to Word", () => {
    expect(appSource).toContain('JSON.stringify({ type: "save_settings_default", settings: s })');
    expect(appSource).toContain("subscribeToDocumentSettings");
    expect(appSource).toContain('persistDefault: true');
    const start = dialogSource.indexOf('if (data.type === "save_settings_default"');
    const end = dialogSource.indexOf('if (data.type === "apply_settings"', start);
    expect(start).toBeGreaterThanOrEqual(0);
    expect(end).toBeGreaterThan(start);
    expect(dialogSource.slice(start, end)).toContain("applyDocumentSettingsDefaultMessage");
    expect(dialogSource.slice(start, end)).not.toContain("applySettingsToWord");
  });

  it("destructures and renders compact standardize and undo actions", () => {
    const componentStart = inspectionSource.indexOf("export function InspectionModal");
    const componentSource = inspectionSource.slice(componentStart);
    expect(componentSource).toMatch(/on1ClickStandardize,\s*onRollback,/);
    expect(componentSource).toContain("onClick={on1ClickStandardize}");
    expect(componentSource).toContain("onClick={onRollback}");
    expect(componentSource).toContain("disabled={busy}");
    expect(componentSource).toContain("Quét lại");
    expect(componentSource).toContain("Sửa tất cả");
  });
});
