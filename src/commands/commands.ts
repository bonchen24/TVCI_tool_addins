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

function requestConfiguration(): void {
  openOfficeDialog("settings");
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
  requestConfiguration();
}, "Không thể mở thiết lập văn bản");

g.openInspectorDialog = (event: CommandEvent) => runCommand(event, async () => {
  openOfficeDialog("inspect");
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
    requestConfiguration();
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
    requestConfiguration();
    return;
  }
  await quickInsertLegalBasis(context.inspection.profileId, lines.join("\n"));
}, "Không thể chèn căn cứ pháp lý");

g.insertRecipientsCmd = (event: CommandEvent) => runCommand(event, async () => {
  const context = await resolveCommandContext();
  const lines = recipientLines(context);
  if (lines.length === 0) {
    requestConfiguration();
    return;
  }
  await insertRecipients(context.inspection.profileId, lines);
}, "Không thể chèn Nơi nhận");

g.insertSignerCmd = (event: CommandEvent) => runCommand(event, async () => {
  const context = await resolveCommandContext();
  const signer = signerData(context);
  if (!signer) {
    requestConfiguration();
    return;
  }
  await quickInsertSigner(context.inspection.profileId, signer.title, signer.name);
}, "Không thể chèn chữ ký");

g.insertAppendixCmd = (event: CommandEvent) => runCommand(event, async () => {
  const context = await resolveCommandContext();
  let title = context.settings?.quickInsert?.appendixTitle?.trim() || "";
  if (!title) title = await tryReadSelection();
  if (!title) {
    requestConfiguration();
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

if (typeof Office !== "undefined") {
  Office.onReady(() => {
    // Ribbon command handlers are registered on the host global above.
  });
}
