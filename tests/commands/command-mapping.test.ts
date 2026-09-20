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
    new RegExp(`<Control[^>]+id="${controlId}"[\\s\\S]*?<\\/Control>`, "m"),
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
    ["QuickStandardizeButton", "run1ClickStandardize"],
    ["SafeFixButton", "runSafeFix"],
    ["RollbackButton", "runRollbackLastAction"],
    ["AddresseeButton", "insertAddresseeCmd"],
    ["LegalBasisButton", "insertLegalBasisCmd"],
    ["RecipientsButton", "insertRecipientsCmd"],
    ["SignerButton", "insertSignerCmd"],
    ["AppendixButton", "insertAppendixCmd"],
    ["OutlineButton", "insertOutlineCmd"],
    ["StandardA4Button", "applyA4Margins"],
    ["ToggleOrientationButton", "toggleOrientationCmd"],
    ["PageNumbersButton", "togglePageNumbers"],
    ["FixTableOverflowButton", "autoFitTableToWindow"],
    ["DeleteBlankPagesButton", "cleanBlankPagesSafe"],
    ["CleanTextButton", "cleanExtraSpacesCmd"],
    ["ConvertUnicodeButton", "convertSelectionToUnicode"],
  ])("maps %s to %s", (controlId, functionName) => {
    expect(commandForControl(controlId)).toBe(functionName);
  });

  it("routes settings and Inspector to dialog-opening commands", () => {
    expect(commandForControl("DocumentSettingsButton")).toBe("openDocumentSettingsDialog");
    expect(commandForControl("CheckDocumentButton")).toBe("openInspectorDialog");
    expect(dialogSource).toContain("displayDialogAsync");
  });

  it("keeps the AI task pane mounted while forms use the modal workflow", () => {
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
