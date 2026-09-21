import React from "react";
import { FormDraftingView, type FormDraftingViewProps } from "./FormDraftingView";

export interface TemplateFormModalProps extends FormDraftingViewProps {
  isOpen: boolean;
}

/**
 * Keeps the AI pane mounted while giving the form its own scrollable workflow.
 * This is intentionally an overlay so a form never changes the primary pane route.
 */
export function TemplateFormModal({ isOpen, ...props }: TemplateFormModalProps): React.ReactElement | null {
  if (!isOpen) return null;
  const isDialog = typeof window !== "undefined" && new URLSearchParams(window.location.search).get("dialog") === "1";

  if (isDialog) {
    return (
      <div className="templateFormModalDialogFullscreen" role="dialog" aria-modal="true" aria-label="Điền biểu mẫu">
        <FormDraftingView {...props} />
      </div>
    );
  }

  return (
    <div className="templateFormModalBackdrop" role="presentation">
      <div className="templateFormModalDialog" role="dialog" aria-modal="true" aria-label="Điền biểu mẫu">
        <FormDraftingView {...props} />
      </div>
    </div>
  );
}
