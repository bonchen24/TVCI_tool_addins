export type DialogView = "settings" | "inspect" | "template" | "template-form";

const FALLBACK_VIEW_KEY = "tvci_pending_dialog_view";

function rememberFallback(view: DialogView): void {
  try {
    localStorage.setItem(FALLBACK_VIEW_KEY, view);
  } catch {
    // Storage is optional in command contexts.
  }
}

export function consumeFallbackView(): DialogView | null {
  try {
    const value = localStorage.getItem(FALLBACK_VIEW_KEY) as DialogView | null;
    if (value === "settings" || value === "inspect" || value === "template" || value === "template-form") {
      localStorage.removeItem(FALLBACK_VIEW_KEY);
      return value;
    }
  } catch {
    // Ignore unavailable storage.
  }
  return null;
}

function showFallbackTaskpane(view: DialogView): void {
  rememberFallback(view);
  const addin = (Office as unknown as { addin?: { showAsTaskpane?: () => Promise<void> } }).addin;
  if (addin?.showAsTaskpane) {
    void addin.showAsTaskpane();
  }
}

export function openOfficeDialog(view: DialogView): void {
  if (typeof Office === "undefined" || !Office.context?.ui?.displayDialogAsync) {
    showFallbackTaskpane(view);
    return;
  }

  const url = new URL(`/dialog.html?view=${view}&dialog=1`, window.location.origin).toString();
  Office.context.ui.displayDialogAsync(
    url,
    { height: 90, width: 90, displayInIframe: true },
    (result) => {
      if (result.status !== Office.AsyncResultStatus.Succeeded) {
        showFallbackTaskpane(view);
        return;
      }

      const dialog = result.value;
      dialog.addEventHandler(Office.EventType.DialogMessageReceived, () => {
        dialog.close();
      });
    },
  );
}

export function closeDialogContainer(): void {
  try {
    Office.context.ui.messageParent(JSON.stringify({ type: "closed" }));
  } catch {
    // This is expected when the same component is rendered inside the task pane.
  }
  try {
    Office.context.ui.closeContainer();
  } catch {
    // No dialog container is available.
  }
}
