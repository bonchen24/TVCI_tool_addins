import fs from "node:fs";
import path from "node:path";

const root = path.resolve(__dirname, "../..");
const appSource = fs.readFileSync(path.join(root, "src/taskpane/App.tsx"), "utf8");
const dialogSource = fs.readFileSync(path.join(root, "src/commands/dialog.ts"), "utf8");

describe("Smart Drafting apply wiring", () => {
  it("waits for the parent result and leaves successful closure to the parent", () => {
    expect(appSource).toContain("smartDraftDialogBridgeRef.current.complete");
    expect(appSource).toContain('type: "smart_draft_complete"');
    const smartDraftHandlerStart = dialogSource.indexOf('if (data.type === "smart_draft_complete"');
    const smartDraftHandlerEnd = dialogSource.indexOf('if (data.type === "insert_template"', smartDraftHandlerStart);
    const smartDraftHandler = dialogSource.slice(smartDraftHandlerStart, smartDraftHandlerEnd);
    expect(smartDraftHandler).toContain("performSmartDraftCompletion");
    expect(smartDraftHandler.indexOf("await insertTemplate(data.template)")).toBeGreaterThanOrEqual(0);
    expect(smartDraftHandler.indexOf("await applyTemplateFormToWord(schema, data.values")).toBeGreaterThan(
      smartDraftHandler.indexOf("await insertTemplate(data.template)"),
    );
    expect(smartDraftHandler).not.toContain("dialog.close()");

    const ackHandlerStart = dialogSource.indexOf('if (data.type === "smart_draft_complete_ack")');
    const ackHandlerEnd = dialogSource.indexOf('if (data.type === "smart_draft_complete"', ackHandlerStart);
    const ackHandler = dialogSource.slice(ackHandlerStart, ackHandlerEnd);
    expect(ackHandler).toContain("closeSmartDraftDialogOnAck");
    expect(ackHandler).toContain("dialog.close()");
  });
});
