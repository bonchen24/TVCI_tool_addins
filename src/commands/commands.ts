import { applyA4Margins, autoFitTableToWindow, cleanBlankPagesSafe } from "../word/page-toolkit.service";
import { applyPageIssueFix, toggleDocumentOrientation } from "../word/page-formatting.service";
import { applyIssueFix, applyTextIssueFix, applyInversePatches } from "../word/formatting.service";
import { TransactionManager, type StandardizationTransaction } from "../word/transaction.service";
import {
  configurePageNumbers,
  hasConfiguredPageNumbers,
  insertAddressee,
  insertAppendix,
  insertOutline,
  insertRecipients,
} from "../word/drafting.service";
import { quickInsertLegalBasis, quickInsertSigner } from "../drafting/quick-insert.service";
import { readSelection } from "../word/selection.service";
import { cleanExtraSpaces, normalizePunctuation, fixManualLineBreaks } from "../word/cleanup.service";
import { detectEncoding, convertTCVN3ToUnicode, convertVNIToUnicode } from "../word/unicode-converter.service";
import { resolveCommandContext, type CommandContext } from "./command-context";
import { openOfficeDialog } from "./dialog";
import { createDocumentSkeleton, type SkeletonDocumentType } from "../word/document-skeleton.service";
import { PRESET_PRESETS } from "../models/document-settings";

function getGlobal(): Record<string, any> {
  if (typeof self !== "undefined") return self as unknown as Record<string, any>;
  if (typeof window !== "undefined") return window as unknown as Record<string, any>;
  if (typeof global !== "undefined") return global as unknown as Record<string, any>;
  return {};
}

type CommandEvent = Office.AddinCommands.Event;
const g = getGlobal();
const txManager = new TransactionManager();

async function runCommand(event: CommandEvent, action: () => Promise<void>, errorLabel = "Ribbon command failed"): Promise<void> {
  try {
    await action();
  } catch (error) {
    console.error(errorLabel, error);
  } finally {
    event.completed();
  }
}

function safeIssues(context: CommandContext) {
  const failedResults = context.inspection.summary.results.filter((result) => result.status === "FAIL");
  const failedRuleIds = new Set(failedResults.map((result) => result.ruleId));
  const failedTargetIds = new Set(failedResults.map((result) => result.targetId).filter(Boolean));
  // MISSING rules never have a repair payload and are explicitly excluded here.
  return context.inspection.summary.issues.filter(
    (issue) => issue.autoFixable && (failedRuleIds.has(issue.ruleId) || failedTargetIds.has(issue.targetId)),
  );
}

async function applySafeIssues(context: CommandContext): Promise<number> {
  let fixed = 0;
  for (const issue of safeIssues(context)) {
    try {
      if (issue.targetId === "page") await applyPageIssueFix(issue);
      else if (issue.ruleId.startsWith("text.")) await applyTextIssueFix(issue);
      else await applyIssueFix(issue);
      fixed += 1;
    } catch (error) {
      console.warn("Could not apply safe issue", issue.ruleId, error);
    }
  }
  return fixed;
}

function configuredLines(lines: string[] | undefined): string[] {
  return (lines ?? []).map((line) => line.trim()).filter(Boolean);
}

async function tryReadSelection(): Promise<string> {
  try {
    return (await readSelection()).trim();
  } catch {
    return "";
  }
}

async function requestConfiguration(): Promise<void> {
  await openOfficeDialog("settings");
}

function addresseeLines(context: CommandContext): string[] {
  const configured = configuredLines(context.settings?.quickInsert?.addressee);
  if (configured.length > 0) return configured;
  return configuredLines(context.activeProfile?.commonRecipients);
}

function recipientLines(context: CommandContext): string[] {
  const configured = configuredLines(context.settings?.recipients);
  if (configured.length > 0) return configured;
  return configuredLines(context.activeProfile?.commonRecipients);
}

function signerData(context: CommandContext): { title: string; name: string } | null {
  const settingsSigner = context.settings?.signer;
  if (settingsSigner?.title?.trim() && settingsSigner.fullName?.trim()) {
    return { title: settingsSigner.title.trim(), name: settingsSigner.fullName.trim() };
  }
  const profileSigner = context.activeProfile?.commonSigners.find((signer) => signer.title.trim() && signer.name.trim());
  return profileSigner ? { title: profileSigner.title.trim(), name: profileSigner.name.trim() } : null;
}

g.applyA4Margins = (event: CommandEvent) => runCommand(event, applyA4Margins, "Không thể áp dụng lề A4");

g.autoFitTableToWindow = (event: CommandEvent) => runCommand(event, async () => {
  const changed = await autoFitTableToWindow();
  if (!changed) console.info("Không tìm thấy bảng để tự động co vừa khổ trang.");
}, "Không thể co bảng vừa khổ trang");

g.cleanBlankPagesSafe = (event: CommandEvent) => runCommand(event, async () => {
  await cleanBlankPagesSafe();
}, "Không thể dọn trang trắng");

g.openDocumentSettingsDialog = (event: CommandEvent) => runCommand(event, async () => {
  await requestConfiguration();
}, "Không thể mở thiết lập văn bản");

g.openInspectorDialog = (event: CommandEvent) => runCommand(event, async () => {
  await openOfficeDialog("inspect");
}, "Không thể mở Inspector");

g.togglePageNumbers = (event: CommandEvent) => runCommand(event, async () => {
  const context = await resolveCommandContext();
  const enabled = await hasConfiguredPageNumbers();
  await configurePageNumbers(context.inspection.profileId, !enabled);
}, "Không thể chuyển trạng thái số trang");

g.run1ClickStandardize = (event: CommandEvent) => runCommand(event, async () => {
  const context = await resolveCommandContext();
  const issues = safeIssues(context);
  if (!context.inspection.summary.isBlankDocument) await applyA4Margins();
  const inversePatches = txManager.calculateInversePatches(context.inspection.paragraphSnapshots, issues);
  const fixed = await applySafeIssues(context);
  if (issues.length > 0 || fixed > 0) {
    const transaction: StandardizationTransaction = {
      id: `tx-${Date.now()}`,
      timestamp: new Date().toISOString(),
      ruleProfileId: context.inspection.profileId,
      totalParagraphsChecked: context.inspection.paragraphSnapshots.length,
      fixedCount: fixed,
      manualReviewCount: Math.max(0, context.inspection.summary.issues.length - fixed),
      tablesProcessedCount: 0,
      blankPagesRemovedCount: 0,
      inversePatches,
    };
    await txManager.commitTransaction(transaction);
  }
}, "Không thể chuẩn hóa văn bản");

g.runSafeFix = (event: CommandEvent) => runCommand(event, async () => {
  const context = await resolveCommandContext();
  const issues = safeIssues(context);
  const inversePatches = txManager.calculateInversePatches(context.inspection.paragraphSnapshots, issues);
  const fixed = await applySafeIssues(context);
  if (issues.length > 0 || fixed > 0) {
    const transaction: StandardizationTransaction = {
      id: `tx-${Date.now()}`,
      timestamp: new Date().toISOString(),
      ruleProfileId: context.inspection.profileId,
      totalParagraphsChecked: context.inspection.paragraphSnapshots.length,
      fixedCount: fixed,
      manualReviewCount: Math.max(0, context.inspection.summary.issues.length - fixed),
      tablesProcessedCount: 0,
      blankPagesRemovedCount: 0,
      inversePatches,
    };
    await txManager.commitTransaction(transaction);
  }
}, "Không thể sửa lỗi an toàn");

g.runRollbackLastAction = (event: CommandEvent) => runCommand(event, async () => {
  const transaction = await txManager.getLatestTransaction();
  if (!transaction?.inversePatches?.length) return;
  await applyInversePatches(transaction.inversePatches);
  await txManager.clearHistory();
}, "Không thể hoàn tác chuẩn hóa");

g.insertAddresseeCmd = (event: CommandEvent) => runCommand(event, async () => {
  const context = await resolveCommandContext();
  const lines = addresseeLines(context);
  if (lines.length === 0) {
    await requestConfiguration();
    return;
  }
  await insertAddressee(context.inspection.profileId, lines);
}, "Không thể chèn Kính gửi");

g.insertLegalBasisCmd = (event: CommandEvent) => runCommand(event, async () => {
  const context = await resolveCommandContext();
  let lines = configuredLines(context.settings?.quickInsert?.legalBasis);
  if (lines.length === 0) {
    const selected = await tryReadSelection();
    if (selected) lines = [selected];
  }
  if (lines.length === 0) {
    await requestConfiguration();
    return;
  }
  await quickInsertLegalBasis(context.inspection.profileId, lines.join("\n"));
}, "Không thể chèn căn cứ pháp lý");

g.insertRecipientsCmd = (event: CommandEvent) => runCommand(event, async () => {
  const context = await resolveCommandContext();
  const lines = recipientLines(context);
  if (lines.length === 0) {
    await requestConfiguration();
    return;
  }
  await insertRecipients(context.inspection.profileId, lines);
}, "Không thể chèn Nơi nhận");

g.insertSignerCmd = (event: CommandEvent) => runCommand(event, async () => {
  const context = await resolveCommandContext();
  const signer = signerData(context);
  if (!signer) {
    await requestConfiguration();
    return;
  }
  await quickInsertSigner(context.inspection.profileId, signer.title, signer.name);
}, "Không thể chèn chữ ký");

g.insertAppendixCmd = (event: CommandEvent) => runCommand(event, async () => {
  const context = await resolveCommandContext();
  let title = context.settings?.quickInsert?.appendixTitle?.trim() || "";
  if (!title) title = await tryReadSelection();
  if (!title) {
    await requestConfiguration();
    return;
  }
  await insertAppendix(context.inspection.profileId, title);
}, "Không thể chèn phụ lục");

g.insertOutlineCmd = (event: CommandEvent) => runCommand(event, async () => {
  const context = await resolveCommandContext();
  const configuredKind = context.settings?.quickInsert?.outlineKind?.trim().toUpperCase();
  const kind = configuredKind || "ARTICLE";
  await insertOutline(context.inspection.profileId, kind as Parameters<typeof insertOutline>[1]);
}, "Không thể chèn đề mục");

g.toggleOrientationCmd = (event: CommandEvent) => runCommand(event, async () => {
  await toggleDocumentOrientation();
}, "Không thể chuyển hướng trang");

g.convertSelectionToUnicode = (event: CommandEvent) => runCommand(event, async () => {
  await Word.run(async (context) => {
    const range = context.document.getSelection();
    range.load("text");
    await context.sync();
    const encoding = detectEncoding(range.text);
    if (encoding === "TCVN3") range.insertText(convertTCVN3ToUnicode(range.text), "Replace");
    if (encoding === "VNI") range.insertText(convertVNIToUnicode(range.text), "Replace");
    await context.sync();
  });
}, "Không thể chuyển mã Unicode");

g.cleanExtraSpacesCmd = (event: CommandEvent) => runCommand(event, async () => {
  await Word.run(async (context) => {
    const range = context.document.getSelection();
    range.load("text");
    await context.sync();
    if (!range.text?.trim()) return;
    const text = normalizePunctuation(fixManualLineBreaks(cleanExtraSpaces(range.text)));
    range.insertText(text, "Replace");
    await context.sync();
  });
}, "Không thể làm sạch văn bản");

export interface ActiveDocumentContextData {
  docType: string;
  templateId?: string;
  templateName?: string;
  department: string;
  organization: string;
  timestamp: number;
}

export function setSharedActiveContext(ctx: Omit<ActiveDocumentContextData, "timestamp">): void {
  try {
    const data: ActiveDocumentContextData = { ...ctx, timestamp: Date.now() };
    localStorage.setItem("tvci_active_document_context", JSON.stringify(data));
  } catch {}
}

g.openTemplateLibraryDialog = (event: CommandEvent) => runCommand(event, async () => {
  await openOfficeDialog("template");
}, "Không thể mở Kho biểu mẫu");

g.openKnowledgeDialog = (event: CommandEvent) => runCommand(event, async () => {
  await openOfficeDialog("knowledge");
}, "Không thể mở Kho kiến thức");

g.openSettingsDialog = (event: CommandEvent) => runCommand(event, async () => {
  await openOfficeDialog("settings_modal");
}, "Không thể mở Cài đặt");

g.createCongVan = (event: CommandEvent) => runCommand(event, async () => {
  const context = await resolveCommandContext();
  const settings = context.settings || PRESET_PRESETS.TVCI;
  await createDocumentSkeleton("cong_van", settings);
  setSharedActiveContext({
    docType: "Công văn",
    department: "Trung tâm TVCI",
    organization: "TVCI",
  });
}, "Không thể tạo khung Công văn");

g.createQuyetDinh = (event: CommandEvent) => runCommand(event, async () => {
  const context = await resolveCommandContext();
  const settings = context.settings || PRESET_PRESETS.TVCI;
  await createDocumentSkeleton("quyet_dinh", settings);
  setSharedActiveContext({
    docType: "Quyết định",
    department: "Trung tâm TVCI",
    organization: "TVCI",
  });
}, "Không thể tạo khung Quyết định");

g.createThongBao = (event: CommandEvent) => runCommand(event, async () => {
  const context = await resolveCommandContext();
  const settings = context.settings || PRESET_PRESETS.TVCI;
  await createDocumentSkeleton("thong_bao", settings);
  setSharedActiveContext({
    docType: "Thông báo",
    department: "Trung tâm TVCI",
    organization: "TVCI",
  });
}, "Không thể tạo khung Thông báo");

g.createToTrinh = (event: CommandEvent) => runCommand(event, async () => {
  const context = await resolveCommandContext();
  const settings = context.settings || PRESET_PRESETS.TVCI;
  await createDocumentSkeleton("to_trinh", settings);
  setSharedActiveContext({
    docType: "Tờ trình",
    department: "Trung tâm TVCI",
    organization: "TVCI",
  });
}, "Không thể tạo khung Tờ trình");

g.createBaoCao = (event: CommandEvent) => runCommand(event, async () => {
  const context = await resolveCommandContext();
  const settings = context.settings || PRESET_PRESETS.TVCI;
  await createDocumentSkeleton("bao_cao", settings);
  setSharedActiveContext({
    docType: "Báo cáo",
    department: "Trung tâm TVCI",
    organization: "TVCI",
  });
}, "Không thể tạo khung Báo cáo");

g.createBienBan = (event: CommandEvent) => runCommand(event, async () => {
  const context = await resolveCommandContext();
  const settings = context.settings || PRESET_PRESETS.TVCI;
  await createDocumentSkeleton("bien_ban", settings);
  setSharedActiveContext({
    docType: "Biên bản",
    department: "Trung tâm TVCI",
    organization: "TVCI",
  });
}, "Không thể tạo khung Biên bản");

g.createKeHoach = (event: CommandEvent) => runCommand(event, async () => {
  const context = await resolveCommandContext();
  const settings = context.settings || PRESET_PRESETS.TVCI;
  await createDocumentSkeleton("ke_hoach", settings);
  setSharedActiveContext({
    docType: "Kế hoạch",
    department: "Trung tâm TVCI",
    organization: "TVCI",
  });
}, "Không thể tạo khung Kế hoạch");

g.createGiayMoi = (event: CommandEvent) => runCommand(event, async () => {
  const context = await resolveCommandContext();
  const settings = context.settings || PRESET_PRESETS.TVCI;
  await createDocumentSkeleton("giay_moi", settings);
  setSharedActiveContext({
    docType: "Giấy mời",
    department: "Trung tâm TVCI",
    organization: "TVCI",
  });
}, "Không thể tạo khung Giấy mời");

g.createPhieu = (event: CommandEvent) => runCommand(event, async () => {
  const context = await resolveCommandContext();
  const settings = context.settings || PRESET_PRESETS.TVCI;
  await createDocumentSkeleton("phieu", {
    ...settings,
    docType: "Phiếu",
    docTitle: "YÊU CẦU / ĐỀ NGHỊ THỬ NGHIỆM",
  });
  setSharedActiveContext({
    docType: "Phiếu",
    department: "Trung tâm TVCI",
    organization: "TVCI",
  });
}, "Không thể tạo khung Phiếu");

g.insertTemplateDienDienTu = (event: CommandEvent) => runCommand(event, async () => {
  const context = await resolveCommandContext();
  const settings = context.settings || PRESET_PRESETS.TVCI;
  await createDocumentSkeleton("cong_van", {
    ...settings,
    docType: "Phiếu yêu cầu thử nghiệm",
    docTitle: "YÊU CẦU THỬ NGHIỆM THIẾT BỊ ĐIỆN - ĐIỆN TỬ",
  });
  setSharedActiveContext({
    docType: "Phiếu yêu cầu thử nghiệm",
    templateId: "tvci-sample-001",
    templateName: "Phiếu thử nghiệm Điện - Điện tử",
    department: "Trung tâm TVCI",
    organization: "TVCI",
  });
}, "Không thể mở mẫu Điện - Điện tử");

g.insertTemplateHieuSuatNangLuong = (event: CommandEvent) => runCommand(event, async () => {
  const context = await resolveCommandContext();
  const settings = context.settings || PRESET_PRESETS.TVCI;
  await createDocumentSkeleton("cong_van", {
    ...settings,
    docType: "Phiếu kết quả thử nghiệm",
    docTitle: "KẾT QUẢ THỬ NGHIỆM HIỆU SUẤT NĂNG LƯỢNG",
  });
  setSharedActiveContext({
    docType: "Phiếu kết quả thử nghiệm",
    templateId: "tvci-sample-001",
    templateName: "Phiếu thử nghiệm Hiệu suất NL",
    department: "Trung tâm TVCI",
    organization: "TVCI",
  });
}, "Không thể mở mẫu Hiệu suất năng lượng");

g.insertTemplateVatLieu = (event: CommandEvent) => runCommand(event, async () => {
  const context = await resolveCommandContext();
  const settings = context.settings || PRESET_PRESETS.TVCI;
  await createDocumentSkeleton("cong_van", {
    ...settings,
    docType: "Phiếu kết quả thử nghiệm",
    docTitle: "KẾT QUẢ THỬ NGHIỆM CƠ LÝ VẬT LIỆU",
  });
  setSharedActiveContext({
    docType: "Phiếu kết quả thử nghiệm",
    templateId: "tvci-sample-001",
    templateName: "Phiếu thử nghiệm Vật liệu",
    department: "Trung tâm TVCI",
    organization: "TVCI",
  });
}, "Không thể mở mẫu Vật liệu");

g.insertTemplateMoiTruong = (event: CommandEvent) => runCommand(event, async () => {
  const context = await resolveCommandContext();
  const settings = context.settings || PRESET_PRESETS.TVCI;
  await createDocumentSkeleton("bien_ban", {
    ...settings,
    docType: "Biên bản quan trắc",
    docTitle: "BIÊN BẢN QUAN TRẮC VÀ LẤY MẪU MÔI TRƯỜNG",
  });
  setSharedActiveContext({
    docType: "Biên bản quan trắc",
    templateId: "tvci-sample-001",
    templateName: "Biên bản quan trắc môi trường",
    department: "Trung tâm TVCI",
    organization: "TVCI",
  });
}, "Không thể mở mẫu Môi trường");

g.insertTemplateGiamDinh = (event: CommandEvent) => runCommand(event, async () => {
  const context = await resolveCommandContext();
  const settings = context.settings || PRESET_PRESETS.TVCI;
  await createDocumentSkeleton("cong_van", {
    ...settings,
    docType: "Chứng thư giám định",
    docTitle: "CHỨNG THƯ GIÁM ĐỊNH CHẤT LƯỢNG SẢN PHẨM HÀNG HÓA",
  });
  setSharedActiveContext({
    docType: "Chứng thư giám định",
    templateId: "tvci-sample-001",
    templateName: "Chứng thư giám định",
    department: "Trung tâm TVCI",
    organization: "TVCI",
  });
}, "Không thể mở mẫu Giám định");

const functionMap: Record<string, (event: CommandEvent) => Promise<void> | void> = {
  openDocumentSettingsDialog: g.openDocumentSettingsDialog,
  openInspectorDialog: g.openInspectorDialog,
  openTemplateLibraryDialog: g.openTemplateLibraryDialog,
  openKnowledgeDialog: g.openKnowledgeDialog,
  openSettingsDialog: g.openSettingsDialog,
  run1ClickStandardize: g.run1ClickStandardize,
  runSafeFix: g.runSafeFix,
  runRollbackLastAction: g.runRollbackLastAction,
  insertAddresseeCmd: g.insertAddresseeCmd,
  insertLegalBasisCmd: g.insertLegalBasisCmd,
  insertRecipientsCmd: g.insertRecipientsCmd,
  insertSignerCmd: g.insertSignerCmd,
  insertAppendixCmd: g.insertAppendixCmd,
  insertOutlineCmd: g.insertOutlineCmd,
  applyA4Margins: g.applyA4Margins,
  toggleOrientationCmd: g.toggleOrientationCmd,
  togglePageNumbers: g.togglePageNumbers,
  autoFitTableToWindow: g.autoFitTableToWindow,
  cleanBlankPagesSafe: g.cleanBlankPagesSafe,
  cleanExtraSpacesCmd: g.cleanExtraSpacesCmd,
  convertSelectionToUnicode: g.convertSelectionToUnicode,
  createCongVan: g.createCongVan,
  createQuyetDinh: g.createQuyetDinh,
  createThongBao: g.createThongBao,
  createToTrinh: g.createToTrinh,
  createBaoCao: g.createBaoCao,
  createBienBan: g.createBienBan,
  createKeHoach: g.createKeHoach,
  createGiayMoi: g.createGiayMoi,
  createPhieu: g.createPhieu,
  insertTemplateDienDienTu: g.insertTemplateDienDienTu,
  insertTemplateHieuSuatNangLuong: g.insertTemplateHieuSuatNangLuong,
  insertTemplateVatLieu: g.insertTemplateVatLieu,
  insertTemplateMoiTruong: g.insertTemplateMoiTruong,
  insertTemplateGiamDinh: g.insertTemplateGiamDinh,
};

function registerAllRibbonActions(): void {
  for (const [name, handler] of Object.entries(functionMap)) {
    g[name] = handler;
    if (typeof Office !== "undefined" && (Office as any).actions?.associate) {
      try {
        (Office as any).actions.associate(name, handler);
      } catch (err) {
        console.warn(`Could not associate action ${name}:`, err);
      }
    }
  }
}

registerAllRibbonActions();

if (typeof Office !== "undefined") {
  Office.onReady(() => {
    registerAllRibbonActions();
  });
}
