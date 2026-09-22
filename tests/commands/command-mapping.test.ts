import fs from "node:fs";
import path from "node:path";

const root = path.resolve(__dirname, "../..");
const manifest = fs.readFileSync(path.join(root, "manifest/manifest.xml"), "utf8");
const commandsSource = fs.readFileSync(path.join(root, "src/commands/commands.ts"), "utf8");
const dialogSource = fs.readFileSync(path.join(root, "src/commands/dialog.ts"), "utf8");
const appSource = fs.readFileSync(path.join(root, "src/taskpane/App.tsx"), "utf8");

function manifestFunctionNames(): string[] {
  return [...manifest.matchAll(/<FunctionName>([^<]+)<\/FunctionName>/g)].map((match) => match[1]);
}

function commandForControl(controlId: string): string | undefined {
  const control = manifest.match(
    new RegExp(`<(?:Control|Item)[^>]+id="${controlId}"[\\s\\S]*?<\\/(?:Control|Item)>`, "m"),
  )?.[0];
  return control?.match(/<FunctionName>([^<]+)<\/FunctionName>/)?.[1];
}

describe("Ribbon command registration and routing", () => {
  it("has an implementation for every manifest FunctionName", () => {
    const names = manifestFunctionNames();
    expect(names.length).toBeGreaterThan(0);

    for (const name of names) {
      expect(commandsSource).toMatch(new RegExp(`g\\.${name}\\s*=`));
      expect(commandsSource).not.toMatch(new RegExp(`g\\.${name}\\s*=\\s*[^\\n]*Not implemented`));
    }
  });

  it.each([
    ["SmartDraftingButton", "openSmartDraftingDialog"],
    ["QuickStandardizeButton", "run1ClickStandardize"],
    ["RollbackButton", "runRollbackLastAction"],
    ["ItemStandardA4", "applyA4Margins"],
    ["ItemToggleOrientation", "toggleOrientationCmd"],
    ["ItemConvertUnicode", "convertSelectionToUnicode"],
    ["ItemCleanExtraSpaces", "cleanExtraSpacesCmd"],
    ["ItemAddressee", "insertAddresseeCmd"],
    ["ItemLegalBasis", "insertLegalBasisCmd"],
    ["ItemRecipients", "insertRecipientsCmd"],
    ["ItemSigner", "insertSignerCmd"],
    ["ItemAppendix", "insertAppendixCmd"],
    ["ItemOutline", "insertOutlineCmd"],
    ["ItemPageNumbers", "togglePageNumbers"],
    ["ItemFixTable", "autoFitTableToWindow"],
    ["ItemDeleteBlankPages", "cleanBlankPagesSafe"],
    ["ItemCreateCongVan", "createCongVan"],
    ["ItemCreateQuyetDinh", "createQuyetDinh"],
    ["ItemCreateThongBao", "createThongBao"],
    ["ItemCreateBaoCao", "createBaoCao"],
    ["ItemCreateToTrinh", "createToTrinh"],
    ["ItemCreateBienBan", "createBienBan"],
    ["ItemCreateKeHoach", "createKeHoach"],
    ["ItemCreateGiayMoi", "createGiayMoi"],
    ["ItemCreatePhieu", "createPhieu"],
    ["TemplateLibraryButton", "openTemplateLibraryDialog"],
    ["TemplateWizardButton", "openTemplateWizardDialog"],
    ["KnowledgeButton", "openKnowledgeDialog"],
    ["SettingsButton", "openSettingsDialog"],
  ])("maps %s to %s", (controlId, functionName) => {
    expect(commandForControl(controlId)).toBe(functionName);
  });

  it("exposes Hoàn tác chuẩn hóa as a direct button immediately after quick standardization", () => {
    const documentGroup = manifest.match(/<Group id="GroupDocument">[\s\S]*?<\/Group>/)?.[0];
    expect(documentGroup).toBeDefined();

    const quickStandardizeIndex = documentGroup!.indexOf('id="QuickStandardizeButton"');
    const rollbackIndex = documentGroup!.indexOf('id="RollbackButton"');
    const toolsMenuIndex = documentGroup!.indexOf('id="DocumentToolsMenu"');
    expect(quickStandardizeIndex).toBeGreaterThanOrEqual(0);
    expect(toolsMenuIndex).toBeGreaterThanOrEqual(0);
    expect(toolsMenuIndex).toBeLessThan(quickStandardizeIndex);
    expect(rollbackIndex).toBeGreaterThan(quickStandardizeIndex);

    expect(documentGroup).toMatch(
      /<Control xsi:type="Menu" id="DocumentToolsMenu">[\s\S]*?<Item id="ItemCheckDocument">[\s\S]*?<FunctionName>openInspectorDialog<\/FunctionName>[\s\S]*?<Item id="ItemDocumentSettings">[\s\S]*?<FunctionName>openDocumentSettingsDialog<\/FunctionName>/,
    );

    expect(documentGroup).toMatch(
      /<Control xsi:type="Button" id="RollbackButton">[\s\S]*?<Label resid="Rollback\.Label"\/>[\s\S]*?<FunctionName>runRollbackLastAction<\/FunctionName>/,
    );
    expect(manifest).toContain('DefaultValue="Hoàn tác chuẩn hóa"');
    expect(manifest).toMatch(
      /<bt:String id="Rollback\.Tooltip" DefaultValue="[^"]*(?:khôi phục|Khôi phục)[^"]*(?:chuẩn hóa|chuẩn hoá)[^"]*"\/>/,
    );
  });

  it("wires semantic icon families to their intended Ribbon controls and items", () => {
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
      expect(control).toBeDefined();
      for (const size of ["16", "32", "80"]) {
        expect(control).toContain(`resid="${resourceFamily}.${size}"`);
      }
    }
  });

  it("routes settings and Inspector to dialog-opening commands", () => {
    expect(commandForControl("ItemDocumentSettings")).toBe("openDocumentSettingsDialog");
    expect(commandForControl("ItemCheckDocument")).toBe("openInspectorDialog");
    expect(dialogSource).toContain("displayDialogAsync");
  });

  it("keeps direct labels for the two primary creation and learning actions", () => {
    expect(manifest).toMatch(/id="TemplateWizardButton"[\s\S]*?<Label resid="TemplateWizard\.Label"\/>/);
    expect(manifest).toMatch(/id="LearnExperienceButton"[\s\S]*?<Label resid="LearnExperience\.Label"\/>/);
    expect(manifest).toContain('DefaultValue="Tạo biểu mẫu"');
    expect(manifest).toContain('DefaultValue="Tạo kinh nghiệm"');
    expect(manifest).not.toContain("Nhận kinh nghiệm");
  });

  it("supports the builder dialog route for the Template Wizard", () => {
    expect(dialogSource).toMatch(/DialogView\s*=.*"builder"/);
    expect(dialogSource).toMatch(/view\s*===\s*"builder"/);
    expect(dialogSource).toMatch(/dialog\.html\?view=\$\{view\}&dialog=1/);
    expect(dialogSource).toMatch(/view\s*===\s*"template"\s*\|\|\s*view\s*===\s*"template-form"\s*\|\|\s*view\s*===\s*"builder"/);
    expect(commandsSource).toMatch(/g\.openTemplateWizardDialog\s*=/);
    expect(commandsSource).toMatch(/runDialogCommand\([\s\S]*?"builder"[\s\S]*?"openTemplateWizardDialog"/);
    expect(commandsSource).toMatch(/openTemplateWizardDialog:\s*g\.openTemplateWizardDialog/);
  });

  it("routes learning and Knowledge buttons to their existing dialogs", () => {
    expect(commandsSource).toMatch(/runDialogCommand\([\s\S]*?"learn_experience"[\s\S]*?"openLearnExperienceDialog"/);
    expect(commandsSource).toMatch(/runDialogCommand\([\s\S]*?"knowledge"[\s\S]*?"openKnowledgeDialog"/);
    expect(dialogSource).toMatch(/DialogView\s*=.*"knowledge"/);
    expect(dialogSource).toMatch(/DialogView\s*=.*"learn_experience"/);
    expect(appSource).toContain('if (v === "knowledge") return "knowledge";');
    expect(appSource).toContain("<KnowledgeModal");
    expect(appSource).toContain('activeModal === "knowledge"');
  });

  it("keeps the create menu limited to the nine document actions", () => {
    const menu = manifest.match(/<Control xsi:type="Menu" id="CreateDocMenu">[\s\S]*?<\/Control>/)?.[0];
    expect(menu).toBeDefined();
    expect(menu).not.toContain("ItemAllTemplates");
    expect([...menu!.matchAll(/<Item id="([^"]+)"/g)].map((match) => match[1])).toEqual([
      "ItemCreateCongVan",
      "ItemCreateQuyetDinh",
      "ItemCreateThongBao",
      "ItemCreateBaoCao",
      "ItemCreateToTrinh",
      "ItemCreateBienBan",
      "ItemCreateKeHoach",
      "ItemCreateGiayMoi",
      "ItemCreatePhieu",
    ]);
  });

  it("uses the compact four-group layout and keeps Knowledge direct", () => {
    const customTab = manifest.match(/<CustomTab id="TabTVCI">[\s\S]*?<\/CustomTab>/)?.[0];
    expect(customTab).toBeDefined();
    expect([...customTab!.matchAll(/<Group id="([^"]+)"/g)].map((match) => match[1])).toEqual([
      "GroupAi",
      "GroupDocument",
      "GroupQuickInsert",
      "GroupLayout",
    ]);
    expect(customTab).toMatch(/<Control xsi:type="Button" id="KnowledgeButton"[\s\S]*?<FunctionName>openKnowledgeDialog<\/FunctionName>/);
    expect(customTab).toMatch(/<Label resid="QuickInsertGroup\.Label"\/>/);
    expect(customTab).toMatch(/<Label resid="PageLayoutGroup\.Label"\/>/);
  });

  it("keeps the TaskPaneApp compatibility source without exposing a Task Pane control", () => {
    expect(manifest).not.toContain('<Action xsi:type="ShowTaskpane">');
    expect(manifest).toContain("<DefaultSettings><SourceLocation");
    expect(appSource).toContain("<AiTaskpaneView");
    expect(appSource).toContain("<TemplateFormModal");
    expect(appSource).not.toContain("activeFormTemplate && activeFormSchema ?");
  });

  it("contains no command-level sample signer or organization literals", () => {
    expect(commandsSource).not.toContain("Nguyễn Văn A");
    expect(commandsSource).not.toContain("NĐ30_TVCI', ['Kính gửi");
    expect(commandsSource).not.toContain("'IEMM'");
    expect(commandsSource).not.toContain("'NĐ30_TVCI'");
    expect(commandsSource).not.toContain("Viện Cơ điện Mỏ");
  });
});
