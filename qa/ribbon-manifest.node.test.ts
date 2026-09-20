import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const manifest = fs.readFileSync("manifest/manifest.xml", "utf8");
const brandAssetGenerator = fs.readFileSync("scripts/generate-ribbon-brand-assets.ps1", "utf8");
const brandingSource = fs.readFileSync("src/branding.ts", "utf8");

test("Ribbon exposes grouped quick-access controls for the main areas", () => {
  const controlCount = (manifest.match(/<Control xsi:type="(?:Button|Menu)"/g) ?? []).length;
  assert.equal(controlCount, 9);

  for (const label of [
    "Soạn thảo AI",
    "Thiết lập",
    "Kiểm tra",
    "Chuẩn hóa",
    "Kho biểu mẫu",
    "Tạo văn bản",
    "Chèn nhanh",
    "Trang",
    "A4 chuẩn",
  ]) {
    assert.match(manifest, new RegExp(label));
  }
});

test("Ribbon controls have valid ExecuteFunction actions", () => {
  for (const id of [
    "SmartDraftingButton",
    "DocumentSettingsButton",
    "CheckDocumentButton",
    "QuickStandardizeButton",
    "TemplateLibraryButton",
    "SettingsButton",
  ]) {
    assert.match(manifest, new RegExp(`id="${id}"[\\s\\S]*?<Action xsi:type="ExecuteFunction">`));
  }
});

test("Ribbon menu items expose actions for templates and quick inserts", () => {
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
    "ItemAllTemplates",
    "ItemAddressee",
    "ItemLegalBasis",
    "ItemRecipients",
    "ItemSigner",
    "ItemAppendix",
    "ItemOutline",
    "ItemStandardA4",
    "ItemToggleOrientation",
    "ItemPageNumbers",
    "ItemFixTable",
    "ItemDeleteBlankPages",
  ]) {
    assert.match(manifest, new RegExp(`id="${itemId}"[\\s\\S]*?<Action xsi:type="ExecuteFunction">`));
  }
});

test("Ribbon controls execute functions directly without triggering taskpane", () => {
  assert.equal(manifest.includes('<Action xsi:type="ShowTaskpane">'), false);
});

test("TVCI Word Tools keeps the add-in identity resources", () => {
  assert.equal(manifest.includes(`<IconUrl DefaultValue="https://localhost:38473/assets/icon-32.png"/>`), true);
  assert.equal(manifest.includes(`<HighResolutionIconUrl DefaultValue="https://localhost:38473/assets/icon-80.png"/>`), true);
  for (const size of ["16", "32", "80"]) {
    assert.equal(manifest.includes(`<bt:Image id="Icon.Brand.${size}"`), true);
  }
});

test("Ribbon organizes cleanly into 5 main groups", () => {
  const customTab = manifest.match(/<CustomTab id="TabTVCI">[\s\S]*?<\/CustomTab>/)?.[0];
  assert.ok(customTab);
  assert.match(customTab, /<Group id="GroupDocument">/);
  assert.match(customTab, /<Group id="GroupQuickInsert">/);
  assert.match(customTab, /<Group id="GroupLayout">/);
  assert.match(customTab, /<Group id="GroupAi">/);
  assert.match(customTab, /<Group id="GroupResources">/);
});

test("brand badge source keeps the full institute and center names", () => {
  assert.match(brandingSource, /VIỆN CƠ KHÍ NĂNG LƯỢNG VÀ MỎ - VINACOMIN/);
  assert.match(brandingSource, /TRUNG TÂM THỬ NGHIỆM - KIỂM ĐỊNH CÔNG NGHIỆP/);
  assert.match(brandingSource, /Mọi yêu cầu hoàn thiện app xin gửi Lương Xuân Hùng - 0983565139/);
  assert.match(brandAssetGenerator, /src\\branding\.ts/);
  assert.match(brandAssetGenerator, /ReadAllText/);
  assert.match(brandAssetGenerator, /developerCredit/);
});
