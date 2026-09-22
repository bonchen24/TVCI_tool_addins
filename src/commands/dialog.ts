import { insertTemplate } from "../word/template.service";
import { getTemplateFormSchema } from "../templates/form-schema";
import { applyTemplateFormToWord } from "../word/form-content-control.service";
import { setMultipleContentControlTexts } from "../word/content-control.service";
import { applySettingsToWord, saveDefaultSettings } from "../models/document-settings";
import { resolveCommandContext } from "./command-context";
import { applySafeIssues } from "./safe-issues";
import { applyIssueFix, applyTextIssueFix, applyInversePatches, selectParagraphByTargetId } from "../word/formatting.service";
import { applyPageIssueFix } from "../word/page-formatting.service";
import { applyA4Margins } from "../word/page-toolkit.service";
import { TransactionManager } from "../word/transaction.service";
import { loadAiSettings } from "../ai/settings";
import { applyAiSettingsClearedMessage, applyAiSettingsSavedMessage } from "../ai/settings-bridge";
import { applyDocumentSettingsDefaultMessage } from "../models/document-settings-bridge";

export type DialogView = "settings" | "inspect" | "template" | "template-form" | "builder" | "knowledge" | "settings_modal" | "smart_draft" | "learn_experience";

let activeDialog: Office.Dialog | null = null;
const txManager = new TransactionManager();

function logDialog(msg: string, extra?: Record<string, any>): void {
  try {
    fetch("/api/log", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ source: "dialog.ts", msg, ...extra }),
    }).catch(() => {});
  } catch {}
}

export function consumeFallbackView(): DialogView | null {
  return null;
}

export async function openOfficeDialog(view: DialogView): Promise<void> {
  if (typeof Office !== "undefined" && Office.onReady) {
    try {
      await Office.onReady();
    } catch {}
  }

  // Close previous dialog if already open to avoid error 12007
  if (activeDialog) {
    try {
      activeDialog.close();
    } catch {}
    activeDialog = null;
  }

  if (view === "inspect") {
    try {
      const ctx = await resolveCommandContext();
      localStorage.setItem("tvci_cached_inspection", JSON.stringify(ctx.inspection));
    } catch (e) {
      logDialog("Pre-inspection error", { error: String(e) });
    }
  } else if (view === "learn_experience") {
    try {
      const { readDocumentText } = await import("../word/selection.service");
      const docText = await readDocumentText();
      localStorage.setItem("tvci_current_doc_text", docText || "");
    } catch (e) {
      logDialog("Pre-read document text error", { error: String(e) });
    }
  }

  return new Promise<void>((resolve) => {
    if (typeof Office === "undefined" || !Office.context?.ui?.displayDialogAsync) {
      logDialog("displayDialogAsync not available in Office.context.ui");
      console.warn("Office.context.ui.displayDialogAsync is not available");
      resolve();
      return;
    }

    let width = 65;
    let height = 70;
    if (view === "template" || view === "template-form" || view === "builder") {
      width = 62;
      height = 68;
    } else if (view === "settings" || view === "settings_modal") {
      width = 54;
      height = 60;
    } else if (view === "inspect") {
      width = 58;
      height = 68;
    } else if (view === "knowledge") {
      width = 64;
      height = 70;
    } else if (view === "smart_draft") {
      width = 52;
      height = 62;
    } else if (view === "learn_experience") {
      width = 52;
      height = 64;
    }

    const baseOrigin =
      typeof window !== "undefined" && window.location?.origin
        ? window.location.origin
        : "https://localhost:38473";
    const url = `${baseOrigin}/dialog.html?view=${view}&dialog=1`;

    logDialog("Opening dialog", { url, width, height });

    Office.context.ui.displayDialogAsync(
      url,
      { height, width },
      (result) => {
        if (result.status !== Office.AsyncResultStatus.Succeeded) {
          const errCode = result.error?.code;
          const errMsg = result.error?.message;
          logDialog("displayDialogAsync failed", { errCode, errMsg });
          console.error("displayDialogAsync failed:", result.error);
          resolve();
          return;
        }

        const dialog = result.value;
        activeDialog = dialog;

        dialog.addEventHandler(Office.EventType.DialogEventReceived, () => {
          logDialog("Dialog closed event received");
          activeDialog = null;
          resolve();
        });

        dialog.addEventHandler(Office.EventType.DialogMessageReceived, async (arg: any) => {
          try {
            const raw = typeof arg === "object" && arg.message ? arg.message : String(arg);
            const data = JSON.parse(raw);
            // Never log the raw dialog payload: AI settings contain an API key.
            logDialog("DialogMessageReceived", { type: typeof data?.type === "string" ? data.type : "unknown" });

            if (data.type === "ai_settings_saved") {
              try {
                const settings = applyAiSettingsSavedMessage(data, localStorage, window);
                dialog.messageChild(JSON.stringify({ type: "ai_settings_saved_result", ok: true, settings }));
              } catch (error) {
                const message = error instanceof Error ? error.message : "Không thể lưu cấu hình AI.";
                logDialog("AI settings save failed", { error: message });
                try {
                  dialog.messageChild(JSON.stringify({ type: "ai_settings_saved_result", ok: false, error: message }));
                } catch {
                  // The dialog may have closed before the failure acknowledgement was delivered.
                }
              }
              return;
            }

            if (data.type === "ai_settings_cleared") {
              try {
                const settings = applyAiSettingsClearedMessage(data, localStorage, window);
                dialog.messageChild(JSON.stringify({ type: "ai_settings_cleared_result", ok: true, settings }));
              } catch (error) {
                const message = error instanceof Error ? error.message : "Không thể xóa cấu hình AI.";
                logDialog("AI settings clear failed", { error: message });
                try {
                  dialog.messageChild(JSON.stringify({ type: "ai_settings_cleared_result", ok: false, error: message }));
                } catch {
                  // The dialog may have closed before the failure acknowledgement was delivered.
                }
              }
              return;
            }

            if (data.type === "closed") {
              dialog.close();
              activeDialog = null;
              resolve();
              return;
            }

            if (data.type === "smart_draft_complete" && data.template) {
              logDialog("Handling smart_draft_complete in parent", { templateId: data.template?.id });
              await insertTemplate(data.template);
              if (data.values) {
                const schema = getTemplateFormSchema(data.template);
                if (schema) {
                  await applyTemplateFormToWord(schema, data.values);
                } else {
                  const items = Object.entries(data.values).map(([tag, value]) => ({
                    tag,
                    value: Array.isArray(value) ? value.join("\n") : String(value || ""),
                  }));
                  await setMultipleContentControlTexts(items);
                }
              }
              dialog.close();
              activeDialog = null;
              resolve();
              return;
            }

            if (data.type === "insert_template" && data.template) {
              logDialog("Handling insert_template in parent", { templateId: data.template?.id });
              await insertTemplate(data.template);
              dialog.close();
              activeDialog = null;
              resolve();
              return;
            }

            if (data.type === "insert_template_fill" && data.template) {
              logDialog("Handling insert_template_fill in parent", { templateId: data.template?.id });
              await insertTemplate(data.template);
              if (data.values) {
                const schema = getTemplateFormSchema(data.template);
                if (schema) {
                  await applyTemplateFormToWord(schema, data.values);
                }
              }
              dialog.close();
              activeDialog = null;
              resolve();
              return;
            }

            if (data.type === "apply_template_form" && data.template && data.values) {
              logDialog("Handling apply_template_form in parent", { templateId: data.template?.id });
              const schema = getTemplateFormSchema(data.template);
              if (schema) {
                await applyTemplateFormToWord(schema, data.values);
              }
              dialog.close();
              activeDialog = null;
              resolve();
              return;
            }

            if (data.type === "save_settings_default" && data.settings) {
              logDialog("Handling save_settings_default in parent");
              applyDocumentSettingsDefaultMessage(data, saveDefaultSettings, window);
              dialog.close();
              activeDialog = null;
              resolve();
              return;
            }

            if (data.type === "apply_settings" && data.settings) {
              logDialog("Handling apply_settings in parent");
              if (data.persistDefault) {
                applyDocumentSettingsDefaultMessage({ type: "save_settings_default", settings: data.settings }, saveDefaultSettings, window);
              }
              await applySettingsToWord(data.settings);
              dialog.close();
              activeDialog = null;
              resolve();
              return;
            }

            if (data.type === "inspect_request") {
              logDialog("Handling inspect_request in parent");
              const ctx = await resolveCommandContext();
              localStorage.setItem("tvci_cached_inspection", JSON.stringify(ctx.inspection));
              localStorage.setItem("tvci_inspection_updated", String(Date.now()));
              return;
            }

            if (data.type === "fix_issue" && data.issue) {
              logDialog("Handling fix_issue in parent", { ruleId: data.issue.ruleId });
              if (data.issue.targetId === "page") await applyPageIssueFix(data.issue);
              else if (data.issue.ruleId.startsWith("text.")) await applyTextIssueFix(data.issue);
              else await applyIssueFix(data.issue);
              const ctx = await resolveCommandContext();
              localStorage.setItem("tvci_cached_inspection", JSON.stringify(ctx.inspection));
              localStorage.setItem("tvci_inspection_updated", String(Date.now()));
              return;
            }

            if (data.type === "fix_all_safe") {
              logDialog("Handling fix_all_safe in parent");
              const ctx = await resolveCommandContext();
              await applySafeIssues(ctx);
              const updatedCtx = await resolveCommandContext();
              localStorage.setItem("tvci_cached_inspection", JSON.stringify(updatedCtx.inspection));
              localStorage.setItem("tvci_inspection_updated", String(Date.now()));
              return;
            }

            if (data.type === "standardize_1click") {
              logDialog("Handling standardize_1click in parent");
              await applyA4Margins();
              const ctx = await resolveCommandContext();
              await applySafeIssues(ctx);
              const updatedCtx = await resolveCommandContext();
              localStorage.setItem("tvci_cached_inspection", JSON.stringify(updatedCtx.inspection));
              localStorage.setItem("tvci_inspection_updated", String(Date.now()));
              return;
            }

            if (data.type === "rollback") {
              logDialog("Handling rollback in parent");
              const transaction = await txManager.getLatestTransaction();
              if (transaction?.inversePatches?.length) {
                await applyInversePatches(transaction.inversePatches);
                await txManager.clearHistory();
              }
              const updatedCtx = await resolveCommandContext();
              localStorage.setItem("tvci_cached_inspection", JSON.stringify(updatedCtx.inspection));
              localStorage.setItem("tvci_inspection_updated", String(Date.now()));
              return;
            }

            if (data.type === "locate_issue" && data.targetId) {
              logDialog("Handling locate_issue in parent", { targetId: data.targetId });
              await selectParagraphByTargetId(data.targetId);
              return;
            }
          } catch (e) {
            logDialog("Dialog message handling error", { error: String(e) });
            console.error("Dialog message handling error:", e);
          }
        });

        if (view === "settings_modal") {
          try {
            dialog.messageChild(JSON.stringify({ type: "ai_settings_current", settings: loadAiSettings() }));
          } catch {
            // The child also loads from same-origin storage on startup.
          }
        }
      },
    );
  });
}

export function closeDialogContainer(): void {
  try {
    Office.context.ui.messageParent(JSON.stringify({ type: "closed" }));
  } catch {
    // This is expected when not in dialog mode.
  }
  try {
    Office.context.ui.closeContainer();
  } catch {
    // No dialog container available.
  }
}
