export interface SmartDraftDialogMessageEvent {
  message: string;
}

export interface SmartDraftDialogRegistrationResult {
  status: string | number;
  error?: { message?: string };
}

export interface SmartDraftDialogUi {
  registerParentMessageHandler(
    handler: (event: SmartDraftDialogMessageEvent) => void,
    callback: (result: SmartDraftDialogRegistrationResult) => void,
  ): void;
  messageParent(message: string): void;
}

export interface SmartDraftCompletionRequest {
  type: "smart_draft_complete";
  requestId: string;
  template: unknown;
  values: Record<string, unknown>;
}

interface SmartDraftCompletionResponse {
  type: "smart_draft_complete_result";
  requestId: string;
  ok: boolean;
  error?: string;
}

interface PendingCompletion {
  requestId: string;
  resolve: () => void;
  reject: (error: Error) => void;
}

function errorMessage(error: unknown): string {
  if (error && typeof error === "object") {
    const errorObject = error as { message?: string; debugInfo?: { message?: string; errorLocation?: string } };
    if (errorObject.debugInfo?.message) {
      const location = errorObject.debugInfo.errorLocation ? ` (${errorObject.debugInfo.errorLocation})` : "";
      return `Lỗi Word: ${errorObject.debugInfo.message}${location}`;
    }
    if (errorObject.message) return errorObject.message;
  }
  return String(error);
}

export class SmartDraftDialogBridge {
  private registration: Promise<void> | null = null;
  private pending: PendingCompletion | null = null;

  constructor(
    private readonly ui: SmartDraftDialogUi,
    private readonly succeededStatus: string | number = "succeeded",
  ) {}

  private readonly handleParentMessage = (event: SmartDraftDialogMessageEvent): void => {
    let response: SmartDraftCompletionResponse;
    try {
      response = JSON.parse(event.message) as SmartDraftCompletionResponse;
    } catch {
      return;
    }

    const pending = this.pending;
    if (
      !pending ||
      response.type !== "smart_draft_complete_result" ||
      response.requestId !== pending.requestId
    ) {
      return;
    }

    this.pending = null;
    if (!response.ok) {
      pending.reject(new Error(response.error || "Không thể điền nội dung vào Word."));
      return;
    }

    try {
      this.ui.messageParent(JSON.stringify({ type: "smart_draft_complete_ack", requestId: pending.requestId }));
      pending.resolve();
    } catch (error) {
      pending.reject(new Error(errorMessage(error)));
    }
  };

  private connect(): Promise<void> {
    if (this.registration) return this.registration;

    this.registration = new Promise<void>((resolve, reject) => {
      try {
        this.ui.registerParentMessageHandler(this.handleParentMessage, (result) => {
          if (result.status !== this.succeededStatus) {
            this.registration = null;
            reject(new Error(result.error?.message || "Không thể nhận phản hồi từ Word."));
            return;
          }
          resolve();
        });
      } catch (error) {
        this.registration = null;
        reject(new Error(errorMessage(error)));
      }
    });

    return this.registration;
  }

  async complete(request: SmartDraftCompletionRequest): Promise<void> {
    await this.connect();
    if (this.pending) throw new Error("Đang có yêu cầu điền biểu mẫu khác được xử lý.");

    return new Promise<void>((resolve, reject) => {
      this.pending = { requestId: request.requestId, resolve, reject };
      try {
        this.ui.messageParent(JSON.stringify(request));
      } catch (error) {
        this.pending = null;
        reject(new Error(errorMessage(error)));
      }
    });
  }
}

export async function performSmartDraftCompletion(
  requestId: string,
  perform: () => Promise<void>,
  sendResponse: (message: string) => void,
  onError?: (error: unknown) => void,
): Promise<boolean> {
  try {
    await perform();
  } catch (error) {
    onError?.(error);
    sendResponse(JSON.stringify({
      type: "smart_draft_complete_result",
      requestId,
      ok: false,
      error: errorMessage(error),
    }));
    return false;
  }

  sendResponse(JSON.stringify({ type: "smart_draft_complete_result", requestId, ok: true }));
  return true;
}

export function closeSmartDraftDialogOnAck(
  requestId: string | null | undefined,
  awaitingRequestId: string | null,
  close: () => void,
): boolean {
  if (!requestId || requestId !== awaitingRequestId) return false;
  close();
  return true;
}
