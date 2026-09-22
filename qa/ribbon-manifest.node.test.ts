import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  inspectCanonicalRibbonManifest,
  manifestAssetPaths,
  missingManifestAssets,
} from "../scripts/ribbon-preservation.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const manifest = fs.readFileSync(path.join(root, "manifest/manifest.xml"), "utf8");
const manifestUpdater = fs.readFileSync(path.join(root, "update-manifest.js"), "utf8");
const brandAssetGenerator = fs.readFileSync(path.join(root, "scripts/generate-ribbon-brand-assets.ps1"), "utf8");
const brandingSource = fs.readFileSync(path.join(root, "src/branding.ts"), "utf8");

test("Ribbon exposes the compact labels for the main user actions", () => {
  const controlCount = (manifest.match(/<Control xsi:type="(?:Button|Menu)"/g) ?? []).length;
  assert.equal(controlCount, 12);

  for (const label of [
    "AI trợ lý",
    "Soạn thảo AI",
    "Tạo kinh nghiệm",
    "Kho tri thức",
    "Cài đặt AI",
    "Văn bản và biểu mẫu",
    "Tạo văn bản",
    "Kho biểu mẫu",
    "Tạo biểu mẫu",
    "Kiểm tra &amp; cấu hình",
    "Kiểm tra văn bản",
    "Chuẩn hóa nhanh",
    "Cấu hình văn bản",
    "Chèn nhanh",
    "Trang và công cụ",
    "Khổ lề A4",
    "Hướng trang",
    "Chuyển Unicode",
    "Dọn khoảng trắng",
    "Co bảng vừa trang",
    "Xóa trang trắng",
  ]) {
    assert.match(manifest, new RegExp(label));
  }
});

test("visible Ribbon buttons route to the agreed dialog and command handlers", () => {
  for (const [id, functionName] of [
    ["SmartDraftingButton", "openSmartDraftingDialog"],
    ["LearnExperienceButton", "openLearnExperienceDialog"],
    ["KnowledgeButton", "openKnowledgeDialog"],
    ["SettingsButton", "openSettingsDialog"],
    ["TemplateLibraryButton", "openTemplateLibraryDialog"],
    ["TemplateWizardButton", "openTemplateWizardDialog"],
    ["ItemDocumentSettings", "openDocumentSettingsDialog"],
    ["ItemCheckDocument", "openInspectorDialog"],
    ["QuickStandardizeButton", "run1ClickStandardize"],
  ]) {
    assert.match(manifest, new RegExp(`id="${id}"[\\s\\S]*?<Action xsi:type="ExecuteFunction"><FunctionName>${functionName}</FunctionName>`));
  }
});

test("Tạo biểu mẫu and Tạo kinh nghiệm are direct top-level buttons", () => {
  for (const [id, label, functionName] of [
    ["TemplateWizardButton", "TemplateWizard.Label", "openTemplateWizardDialog"],
    ["LearnExperienceButton", "LearnExperience.Label", "openLearnExperienceDialog"],
  ]) {
    assert.match(manifest, new RegExp(`<Control xsi:type="Button" id="${id}">[\\s\\S]*?<Label resid="${label}"\\/>[\\s\\S]*?<FunctionName>${functionName}<\\/FunctionName>`));
  }
  assert.doesNotMatch(manifest, /Nhận kinh nghiệm/);
});

test("Ribbon menu items expose actions for templates, quick inserts, and pages", () => {
  for (const itemId of [
    "ItemCreateCongVan",
    "ItemCreateQuyetDinh",
    "ItemCreateThongBao",
    "ItemCreateBaoCao",
    "ItemCreateToTrinh",
    "ItemCreateBienBan",
    "ItemCreateKeHoach",
    "ItemCreateGiayMoi",
    "ItemCreatePhieu",
    "ItemAddressee",
    "ItemLegalBasis",
    "ItemRecipients",
    "ItemSigner",
    "ItemAppendix",
    "ItemOutline",
    "ItemStandardA4",
    "ItemToggleOrientation",
    "ItemConvertUnicode",
    "ItemCleanExtraSpaces",
    "ItemPageNumbers",
    "ItemFixTable",
    "ItemDeleteBlankPages",
  ]) {
    assert.match(manifest, new RegExp(`id="${itemId}"[\\s\\S]*?<Action xsi:type="ExecuteFunction">`));
  }
});

test("every visible ExecuteFunction is registered by commands.ts", () => {
  const commandsSource = fs.readFileSync(path.join(root, "src/commands/commands.ts"), "utf8");
  const visibleFunctionNames = [...manifest.matchAll(/<FunctionName>([^<]+)<\/FunctionName>/g)].map((match) => match[1]);
  assert.ok(visibleFunctionNames.length > 0);

  for (const name of visibleFunctionNames) {
    assert.match(commandsSource, new RegExp(`g\\.${name}\\s*=`));
    assert.match(commandsSource, new RegExp(`${name}: g\\.${name}`));
  }
});

test("semantic Ribbon icons are wired to the intended controls and items", () => {
  for (const [controlId, resourceFamily] of [
    ["TemplateLibraryButton", "Icon.Library"],
    ["TemplateWizardButton", "Icon.Builder"],
    ["KnowledgeButton", "Icon.Read"],
    ["ItemConvertUnicode", "Icon.ConvertUnicode"],
    ["ItemCleanExtraSpaces", "Icon.FixSpacing"],
    ["RollbackButton", "Icon.Rollback"],
  ]) {
    const control = manifest.match(
      new RegExp(`<(?:Control|Item)[^>]+id="${controlId}"[\\s\\S]*?<\\/(?:Control|Item)>`, "m"),
    )?.[0];
    assert.ok(control, `missing Ribbon control ${controlId}`);
    for (const size of ["16", "32", "80"]) {
      assert.match(control, new RegExp(`resid="${resourceFamily}\\.${size}"`));
    }
  }
});

test("every localhost Ribbon image URL points to an existing local asset", () => {
  const paths = manifestAssetPaths(manifest).filter((relativePath) => relativePath.startsWith("assets/ribbon/"));
  assert.ok(paths.length > 0);
  assert.deepEqual(missingManifestAssets(manifest, root), []);
  for (const relativePath of paths) assert.equal(fs.existsSync(path.join(root, ...relativePath.split("/"))), true);
});

test("canonical Ribbon preservation contract is present in the source manifest", () => {
  const check = inspectCanonicalRibbonManifest(manifest);
  assert.equal(check.ok, true, JSON.stringify(check));
});

test("Ribbon resource ids are unique", () => {
  const ids = [...manifest.matchAll(/<bt:(?:Image|Url|String)\s+id="([^"]+)"/g)].map((match) => match[1]);
  const duplicates = ids.filter((id, index) => ids.indexOf(id) !== index);
  assert.deepEqual([...new Set(duplicates)], []);
});

test("Ribbon controls execute functions directly without exposing a Task Pane", () => {
  assert.equal(manifest.includes('<Action xsi:type="ShowTaskpane">'), false);
  assert.doesNotMatch(manifestUpdater, /ShowTaskpane/);
  assert.equal(manifest.includes("Taskpane."), false);
  assert.doesNotMatch(manifest, /<SupportUrl[^>]*taskpane\.html/);
  assert.equal((manifest.match(/taskpane\.html/g) ?? []).length, 1);
  assert.match(manifest, /<DefaultSettings><SourceLocation DefaultValue="https:\/\/localhost:38473\/taskpane\.html"\/><\/DefaultSettings>/);
});

test("TVCI Word Tools keeps the add-in identity resources", () => {
  assert.equal(manifest.includes(`<IconUrl DefaultValue="https://localhost:38473/assets/icon-32.png"/>`), true);
  assert.equal(manifest.includes(`<HighResolutionIconUrl DefaultValue="https://localhost:38473/assets/icon-80.png"/>`), true);
  for (const size of ["16", "32", "80"]) {
    assert.equal(manifest.includes(`<bt:Image id="Icon.Brand.${size}"`), true);
  }
});

test("Ribbon has only the four compact user-facing groups in order", () => {
  const customTab = manifest.match(/<CustomTab id="TabTVCI">[\s\S]*?<\/CustomTab>/)?.[0];
  assert.ok(customTab);
  const groupIds = [...customTab.matchAll(/<Group id="([^"]+)"/g)].map((match) => match[1]);
  assert.deepEqual(groupIds, ["GroupAi", "GroupDocument", "GroupQuickInsert", "GroupLayout"]);
  assert.doesNotMatch(customTab, /GroupResources|DeptTemplates|Mẫu chuyên môn/);
});

test("template library and wizard are direct document-group buttons", () => {
  assert.equal((manifest.match(/id="TemplateLibraryButton"/g) ?? []).length, 1);
  assert.equal((manifest.match(/id="TemplateWizardButton"/g) ?? []).length, 1);
  assert.match(manifest, /id="TemplateLibraryButton"[\s\S]*?<Label resid="TemplateLibrary\.Label"\/>[\s\S]*?<FunctionName>openTemplateLibraryDialog<\/FunctionName>/);
  assert.match(manifest, /id="TemplateWizardButton"[\s\S]*?<Label resid="TemplateWizard\.Label"\/>[\s\S]*?<FunctionName>openTemplateWizardDialog<\/FunctionName>/);
  const menu = manifest.match(/<Control xsi:type="Menu" id="CreateDocMenu">[\s\S]*?<\/Control>/)?.[0];
  assert.ok(menu);
  assert.doesNotMatch(menu, /ItemAllTemplates/);
  assert.equal((menu.match(/<Item id="/g) ?? []).length, 9);
});

test("Ribbon group menus use compact labels and the agreed quick actions", () => {
  const customTab = manifest.match(/<CustomTab id="TabTVCI">[\s\S]*?<\/CustomTab>/)?.[0] ?? "";
  assert.match(customTab, /<Control xsi:type="Menu" id="QuickInsertMenu">\s*<Label resid="QuickInsertMenu\.Label"\/>/);
  assert.match(customTab, /<Control xsi:type="Menu" id="PageLayoutMenu">\s*<Label resid="PageLayoutMenu\.Label"\/>/);
  assert.match(customTab, /<Control xsi:type="Menu" id="DocumentToolsMenu">[\s\S]*?<Label resid="DocumentToolsMenu\.Label"\/>[\s\S]*?<Item id="ItemCheckDocument">[\s\S]*?<FunctionName>openInspectorDialog<\/FunctionName>[\s\S]*?<Item id="ItemDocumentSettings">[\s\S]*?<FunctionName>openDocumentSettingsDialog<\/FunctionName>/);
  assert.match(customTab, /<Control xsi:type="Button" id="TemplateLibraryButton"/);
  assert.match(customTab, /<Control xsi:type="Button" id="TemplateWizardButton"/);
});

test("layout and document controls expose the required command set", () => {
  for (const [id, functionName] of [
    ["ItemDocumentSettings", "openDocumentSettingsDialog"],
    ["ItemCheckDocument", "openInspectorDialog"],
    ["QuickStandardizeButton", "run1ClickStandardize"],
    ["ItemConvertUnicode", "convertSelectionToUnicode"],
    ["ItemCleanExtraSpaces", "cleanExtraSpacesCmd"],
  ]) {
    assert.match(manifest, new RegExp(`id="${id}"[\\s\\S]*?<FunctionName>${functionName}<\\/FunctionName>`));
  }
});

test("DialogView supports the builder route and commands registers its handler", () => {
  const dialogSource = fs.readFileSync(path.join(root, "src/commands/dialog.ts"), "utf8");
  const commandsSource = fs.readFileSync(path.join(root, "src/commands/commands.ts"), "utf8");
  assert.match(dialogSource, /DialogView\s*=.*"builder"/);
  assert.match(dialogSource, /view\s*===\s*"builder"/);
  assert.match(dialogSource, /dialog\.html\?view=\$\{view\}&dialog=1/);
  assert.match(commandsSource, /g\.openTemplateWizardDialog\s*=/);
  assert.match(commandsSource, /openOfficeDialog\("builder"\)/);
  assert.match(commandsSource, /openTemplateWizardDialog:\s*g\.openTemplateWizardDialog/);
});

test("brand badge source keeps the full institute and center names", () => {
  assert.match(brandingSource, /VIỆN CƠ KHÍ NĂNG LƯỢNG VÀ MỎ - VINACOMIN/);
  assert.match(brandingSource, /TRUNG TÂM THỬ NGHIỆM - KIỂM ĐỊNH CÔNG NGHIỆP/);
  assert.match(brandingSource, /Mọi yêu cầu hoàn thiện app xin gửi Lương Xuân Hùng - 0983565139/);
  assert.match(brandAssetGenerator, /src\\branding\.ts/);
  assert.match(brandAssetGenerator, /ReadAllText/);
  assert.match(brandAssetGenerator, /developerCredit/);
});
