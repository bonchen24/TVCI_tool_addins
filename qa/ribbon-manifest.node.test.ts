import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const manifest = fs.readFileSync("manifest/manifest.xml", "utf8");
const brandAssetGenerator = fs.readFileSync("scripts/generate-ribbon-brand-assets.ps1", "utf8");
const brandingSource = fs.readFileSync("src/branding.ts", "utf8");

test("Ribbon exposes grouped quick-access buttons for the main task-pane areas", () => {
  const buttonCount = (manifest.match(/<Control xsi:type="Button"/g) ?? []).length;
  assert.equal(buttonCount >= 7, true);

  for (const label of [
    "Đọc đoạn chọn",
    "Kiểm tra văn bản",
    "Soạn thảo chuẩn",
    "Kính gửi",
    "Nơi nhận",
    "Đường kẻ",
    "Số trang",
    "Kho biểu mẫu",
    "AI Soạn thảo",
    "Kiểm tra lỗi",
    "Tạo biểu mẫu",
    "Phụ lục &amp; bảng",
    "Thêm phụ lục",
    "Tạo bảng phụ lục",
    "Đánh số bảng",
    "Điền biểu mẫu",
    "Hướng dẫn nhanh",
  ]) {
    assert.match(manifest, new RegExp(label));
  }
});

test("Ribbon quick-access controls all open the existing task pane", () => {
  for (const id of [
    "ReadSelectionButton",
    "CheckDocumentButton",
    "StandardDraftingButton",
    "AddresseeButton",
    "RecipientsButton",
    "HorizontalRuleButton",
    "PageNumbersButton",
    "TemplateLibraryButton",
    "AiWorkspaceButton",
    "ProofreadButton",
    "TemplateBuilderButton",
    "AppendixButton",
    "AppendixTableButton",
    "NumberTableButton",
    "TemplateFillButton",
    "GuidanceButton",
    "OpenTaskpaneButton",
  ]) {
    assert.match(manifest, new RegExp(`id="${id}"[\\s\\S]*?<Action xsi:type="ShowTaskpane">`));
  }
});

test("Ribbon quick-access controls route users to the matching task-pane area", () => {
  for (const [id, resource] of [
    ["ReadSelectionButton", "Taskpane.Standardize.Url"],
    ["CheckDocumentButton", "Taskpane.Standardize.Url"],
    ["StandardDraftingButton", "Taskpane.Drafting.Url"],
    ["AddresseeButton", "Taskpane.Addressee.Url"],
    ["RecipientsButton", "Taskpane.Recipients.Url"],
    ["HorizontalRuleButton", "Taskpane.Drafting.Url"],
    ["PageNumbersButton", "Taskpane.Drafting.Url"],
    ["TemplateLibraryButton", "Taskpane.Library.Url"],
    ["AiWorkspaceButton", "Taskpane.Ai.Url"],
    ["ProofreadButton", "Taskpane.Proofread.Url"],
    ["TemplateBuilderButton", "Taskpane.Builder.Url"],
    ["AppendixButton", "Taskpane.Appendix.Url"],
    ["AppendixTableButton", "Taskpane.Appendix.Url"],
    ["NumberTableButton", "Taskpane.Appendix.Url"],
    ["TemplateFillButton", "Taskpane.TemplateFill.Url"],
    ["GuidanceButton", "Taskpane.Guidance.Url"],
    ["OpenTaskpaneButton", "Taskpane.Url"],
  ]) {
    assert.match(manifest, new RegExp(`id="${id}"[\\s\\S]*?<SourceLocation resid="${resource}"/>`));
  }
});

test("TVCI Word Tools keeps the add-in identity resources", () => {
  const brandBadge = (size: string) => `https://localhost:38473/assets/ribbon/icon-brand-badge-${size}.png`;

  assert.equal(manifest.includes(`<IconUrl DefaultValue="https://localhost:38473/assets/logo-tvci.png"/>`), true);
  assert.equal(manifest.includes(`<HighResolutionIconUrl DefaultValue="https://localhost:38473/assets/logo-tvci.png"/>`), true);
  for (const size of ["16", "32", "80"]) {
    assert.equal(manifest.includes(`<bt:Image id="Icon.Brand.${size}" DefaultValue="${brandBadge(size)}"/>`), true);
  }
});

test("Ribbon keeps feature icons on actions and places the TVCI brand group last", () => {
  const expectedIconByControl = [
    ["CheckDocumentButton", "Icon.Proofread"],
    ["ReadSelectionButton", "Icon.Read"],
    ["StandardDraftingButton", "Icon.Drafting"],
    ["AddresseeButton", "Icon.Addressee"],
    ["RecipientsButton", "Icon.Recipients"],
    ["HorizontalRuleButton", "Icon.Rule"],
    ["PageNumbersButton", "Icon.PageNumbers"],
    ["AppendixButton", "Icon.Appendix"],
    ["AppendixTableButton", "Icon.Table"],
    ["NumberTableButton", "Icon.Numbering"],
    ["TemplateLibraryButton", "Icon.Library"],
    ["AiWorkspaceButton", "Icon.Ai"],
    ["ProofreadButton", "Icon.Proofread"],
    ["TemplateBuilderButton", "Icon.Builder"],
    ["TemplateFillButton", "Icon.Fill"],
    ["GuidanceButton", "Icon.Guidance"],
    ["OpenTaskpaneButton", "Icon.Brand"],
  ] as const;

  for (const [controlId, iconPrefix] of expectedIconByControl) {
    const control = manifest.match(new RegExp(`<Control xsi:type="Button" id="${controlId}"[\\s\\S]*?<\\/Control>`))?.[0];
    assert.ok(control, `${controlId} must be present in the Ribbon`);
    for (const size of ["16", "32", "80"]) {
      assert.match(control, new RegExp(`<bt:Image size="${size}" resid="${iconPrefix}\\.${size}"/>`));
    }
  }

  const ribbonLogoReferences = manifest.match(/resid="Icon\.Brand\.(?:16|32|80)"/g) ?? [];
  assert.equal(ribbonLogoReferences.length, 6);
  assert.doesNotMatch(manifest, /resid="Icon\.(?:16|32|80)"/);

  const standardizeGroup = manifest.match(/<Group id="GroupStandardize">[\s\S]*?<\/Group>/)?.[0];
  assert.ok(standardizeGroup);
  assert.doesNotMatch(standardizeGroup, /OpenTaskpaneButton/);

  const customTab = manifest.match(/<CustomTab id="TabTVCI">[\s\S]*?<\/CustomTab>/)?.[0];
  assert.ok(customTab);
  assert.match(customTab, /<Group id="GroupUtilities">[\s\S]*?<\/Group>\s*<Group id="GroupBrand">/);
  assert.match(customTab, /<Group id="GroupBrand">[\s\S]*?<\/Group>\s*<Label resid="Tab\.Label"\/>/);

  const brandGroup = customTab.match(/<Group id="GroupBrand">[\s\S]*?<\/Group>/)?.[0];
  assert.ok(brandGroup);
  assert.match(brandGroup, /<Label resid="BrandGroup\.Label"\/>/);
  assert.match(brandGroup, /<bt:Image size="16" resid="Icon\.Brand\.16"\/>/);
  assert.match(brandGroup, /id="OpenTaskpaneButton"[\s\S]*?<Label resid="BrandButton\.Label"\/>[\s\S]*?<Action xsi:type="ShowTaskpane">[\s\S]*?<SourceLocation resid="Taskpane\.Url"\/>/);
  assert.match(manifest, /<bt:String id="BrandGroup\.Label" DefaultValue="TVCI Word Tools"\/>/);
  assert.match(manifest, /<bt:String id="BrandButton\.Label" DefaultValue="TVCI Word Tools"\/>/);
  assert.match(manifest, /<bt:String id="BrandButton\.Tooltip" DefaultValue="Mở TVCI Word Tools trong Task Pane\."\/>/);
});

test("brand badge source keeps the full institute and center names", () => {
  assert.match(brandingSource, /VIỆN CƠ KHÍ NĂNG LƯỢNG VÀ MỎ - VINACOMIN/);
  assert.match(brandingSource, /TRUNG TÂM THỬ NGHIỆM - KIỂM ĐỊNH CÔNG NGHIỆP/);
  assert.match(brandingSource, /Mọi yêu cầu hoàn thiện app xin gửi Lương Xuân Hùng - 0983565139/);
  assert.match(brandAssetGenerator, /src\\branding\.ts/);
  assert.match(brandAssetGenerator, /ReadAllText/);
  assert.match(brandAssetGenerator, /developerCredit/);
});
