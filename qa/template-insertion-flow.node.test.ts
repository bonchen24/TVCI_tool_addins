import test from "node:test";
import assert from "node:assert/strict";
import { runTemplateInsertion } from "../src/taskpane/template-insertion.ts";

test("template insertion does not invoke printer-dependent page setup", async () => {
  const calls: string[] = [];

  await runTemplateInsertion(async () => {
    calls.push("insert");
  });

  assert.deepEqual(calls, ["insert"]);
});

test("propagates the DOCX insertion error", async () => {
  await assert.rejects(
    () => runTemplateInsertion(async () => {
      throw new Error("DOCX insertion failed");
    }),
    /DOCX insertion failed/,
  );
});
