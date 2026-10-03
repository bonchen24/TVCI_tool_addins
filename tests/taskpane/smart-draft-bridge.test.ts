import {
  closeSmartDraftDialogOnAck,
  performSmartDraftCompletion,
  SmartDraftDialogBridge,
} from "../../src/commands/smart-draft-bridge";

type ParentMessageHandler = (event: { message: string }) => void;
type RegistrationResult = { status: string | number; error?: { message?: string } };

function makeDialogUi() {
  let receiveParentMessage: ParentMessageHandler | undefined;
  let registrationCallback: ((result: RegistrationResult) => void) | undefined;
  const sentToParent: string[] = [];
  const ui = {
    registerParentMessageHandler: (handler: ParentMessageHandler, callback: (result: RegistrationResult) => void) => {
      receiveParentMessage = handler;
      registrationCallback = callback;
    },
    messageParent: (message: string) => sentToParent.push(message),
  };
  return {
    ui,
    sentToParent,
    register: (result: RegistrationResult = { status: "succeeded" }) => registrationCallback?.(result),
    receive: (message: string) => receiveParentMessage?.({ message }),
  };
}

describe("Smart Draft dialog handshake", () => {
  it("keeps the completion pending until the matching parent confirms Word finished", async () => {
    const dialog = makeDialogUi();
    const bridge = new SmartDraftDialogBridge(dialog.ui);
    const request = { type: "smart_draft_complete" as const, requestId: "request-1", template: { id: "sample" }, values: { TRICH_YEU: "Nội dung" } };
    let completed = false;
    const completion = bridge.complete(request).then(() => { completed = true; });

    dialog.register();
    await Promise.resolve();
    expect(dialog.sentToParent).toEqual([JSON.stringify(request)]);
    dialog.receive('{"type":"smart_draft_complete_result","requestId":"other-request","ok":true}');
    expect(completed).toBe(false);

    dialog.receive('{"type":"smart_draft_complete_result","requestId":"request-1","ok":true}');
    await expect(completion).resolves.toBeUndefined();
    expect(dialog.sentToParent[1]).toBe('{"type":"smart_draft_complete_ack","requestId":"request-1"}');
    expect(completed).toBe(true);
  });

  it("returns a parent Word error to the caller without acknowledging failure", async () => {
    const dialog = makeDialogUi();
    const bridge = new SmartDraftDialogBridge(dialog.ui);
    const completion = bridge.complete({ type: "smart_draft_complete", requestId: "request-2", template: { id: "sample" }, values: {} });
    dialog.register();
    await Promise.resolve();
    dialog.receive('{"type":"smart_draft_complete_result","requestId":"request-2","ok":false,"error":"Không thể điền vào Word"}');

    await expect(completion).rejects.toThrow("Không thể điền vào Word");
    expect(dialog.sentToParent).toEqual(['{"type":"smart_draft_complete","requestId":"request-2","template":{"id":"sample"},"values":{}}']);
  });

  it("registers the parent listener once for repeated completion attempts", async () => {
    const dialog = makeDialogUi();
    const bridge = new SmartDraftDialogBridge(dialog.ui);
    const first = bridge.complete({ type: "smart_draft_complete", requestId: "request-3", template: { id: "sample" }, values: {} });
    dialog.register();
    await Promise.resolve();
    dialog.receive('{"type":"smart_draft_complete_result","requestId":"request-3","ok":false,"error":"retry"}');
    await expect(first).rejects.toThrow("retry");

    const second = bridge.complete({ type: "smart_draft_complete", requestId: "request-4", template: { id: "sample" }, values: {} });
    await Promise.resolve();
    expect(dialog.sentToParent).toHaveLength(2);
    dialog.receive('{"type":"smart_draft_complete_result","requestId":"request-4","ok":true}');
    await expect(second).resolves.toBeUndefined();
  });

  it("accepts the Office AsyncResultStatus enum value when registering the listener", async () => {
    const dialog = makeDialogUi();
    const bridge = new SmartDraftDialogBridge(dialog.ui, 0);
    const completion = bridge.complete({ type: "smart_draft_complete", requestId: "request-9", template: { id: "sample" }, values: {} });

    dialog.register({ status: 0 });
    await Promise.resolve();
    dialog.receive('{"type":"smart_draft_complete_result","requestId":"request-9","ok":true}');

    await expect(completion).resolves.toBeUndefined();
  });

  it("reports success only after the Word operation finishes", async () => {
    const messages: string[] = [];
    let finishOperation: (() => void) | undefined;
    const operation = new Promise<void>((resolve) => {
      finishOperation = resolve;
    });

    const result = performSmartDraftCompletion("request-5", () => operation, (message: string) => messages.push(message));
    expect(messages).toEqual([]);

    finishOperation?.();
    await expect(result).resolves.toBe(true);
    expect(messages).toEqual(['{"type":"smart_draft_complete_result","requestId":"request-5","ok":true}']);
  });

  it("returns the Word error to the dialog and reports failure", async () => {
    const messages: string[] = [];
    const result = await performSmartDraftCompletion(
      "request-6",
      async () => { throw new Error("Body.insertFileFromBase64 failed"); },
      (message: string) => messages.push(message),
    );

    expect(result).toBe(false);
    expect(messages).toEqual(['{"type":"smart_draft_complete_result","requestId":"request-6","ok":false,"error":"Body.insertFileFromBase64 failed"}']);
  });

  it("includes the failing Word API location in the returned error", async () => {
    const messages: string[] = [];
    const error = new Error("GeneralException") as Error & { debugInfo?: { message: string; errorLocation: string } };
    error.debugInfo = { message: "Invalid document content", errorLocation: "Body.insertFileFromBase64" };

    await performSmartDraftCompletion("request-8", async () => { throw error; }, (message) => messages.push(message));

    expect(messages).toEqual(['{"type":"smart_draft_complete_result","requestId":"request-8","ok":false,"error":"Lỗi Word: Invalid document content (Body.insertFileFromBase64)"}']);
  });

  it("closes only after the dialog acknowledges the matching successful request", () => {
    const close = jest.fn();
    expect(closeSmartDraftDialogOnAck("request-7", "other-request", close)).toBe(false);
    expect(close).not.toHaveBeenCalled();
    expect(closeSmartDraftDialogOnAck("request-7", "request-7", close)).toBe(true);
    expect(close).toHaveBeenCalledTimes(1);
  });
});
