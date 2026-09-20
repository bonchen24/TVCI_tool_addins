import { insertTemplate } from "../word/template.service";
import { getTemplateFormSchema } from "../templates/form-schema";
import { applyTemplateFormToWord } from "../word/form-content-control.service";
import { setMultipleContentControlTexts } from "../word/content-control.service";

export type DialogView = "settings" | "inspect" | "template" | "template-form" | "knowledge" | "settings_modal" | "smart_draft";

let activeDialog: Office.Dialog | null = null;

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

  return new Promise<void>((resolve) => {
    if (typeof Office === "undefined" || !Office.context?.ui?.displayDialogAsync) {
      logDialog("displayDialogAsync not available in Office.context.ui");
      console.warn("Office.context.ui.displayDialogAsync is not available");
      resolve();
      return;
    }

    let width = 65;
    let height = 70;
    if (view === "template" || view === "template-form") {
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
        resolve();

        dialog.addEventHandler(Office.EventType.DialogEventReceived, () => {
          activeDialog = null;
        });

        dialog.addEventHandler(Office.EventType.DialogMessageReceived, async (arg: any) => {
          try {
            const raw = typeof arg === "object" && arg.message ? arg.message : String(arg);
            const data = JSON.parse(raw);
            if (data.type === "closed") {
              dialog.close();
              activeDialog = null;
              return;
            }
            if (data.type === "smart_draft_complete" && data.template) {
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
              try {
                await (Office as any).addin?.showAsTaskpane();
              } catch {}
              dialog.close();
              activeDialog = null;
              return;
            }
            if (data.type === "insert_template" && data.template) {
              await insertTemplate(data.template);
              dialog.close();
              activeDialog = null;
              return;
            }
            if (data.type === "insert_template_fill" && data.template) {
              await insertTemplate(data.template);
              if (data.values) {
                const schema = getTemplateFormSchema(data.template);
                if (schema) {
                  await applyTemplateFormToWord(schema, data.values);
                }
              }
              dialog.close();
              activeDialog = null;
              return;
            }
            if (data.type === "apply_template_form" && data.template && data.values) {
              const schema = getTemplateFormSchema(data.template);
              if (schema) {
                await applyTemplateFormToWord(schema, data.values);
              }
              dialog.close();
              activeDialog = null;
              return;
            }
          } catch (e) {
            console.error("Dialog message handling error:", e);
          }
          dialog.close();
          activeDialog = null;
        });
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
