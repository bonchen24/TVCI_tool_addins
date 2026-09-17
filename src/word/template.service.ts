import type { TemplateRecord } from "../templates/library";
import { getUserTemplateData } from "../templates/storage";

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, Math.min(i + chunk, bytes.length)));
  }
  return btoa(binary);
}

function resolveBundledTemplateUrl(path: string): string {
  const relativePath = path.replace(/^\/+/, "");
  if (typeof document === "undefined" || !document.baseURI) return relativePath;
  return new URL(relativePath, document.baseURI).toString();
}

async function resolveTemplateData(template: TemplateRecord): Promise<ArrayBuffer> {
  if (template.source.kind === "user") return getUserTemplateData(template.source.storageId);
  const response = await fetch(resolveBundledTemplateUrl(template.source.path), { cache: "no-store" });
  if (!response.ok) throw new Error(`Không tải được biểu mẫu (${response.status}).`);
  return response.arrayBuffer();
}

function sendDebug(msg: string) {
  try {
    fetch("/api/log", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ source: "template.service", msg }),
    }).catch(() => {});
  } catch {}
}

export async function insertTemplate(template: TemplateRecord): Promise<void> {
  sendDebug(`insertTemplate starting: ${template.id} - ${template.name}`);
  try {
    try {
      if (typeof OfficeExtension !== "undefined" && OfficeExtension?.config) {
        (OfficeExtension.config as any).extendedErrorLogging = true;
      }
    } catch {}
    const data = await resolveTemplateData(template);
    sendDebug(`template loaded, bytes: ${data.byteLength}`);
    const base64 = arrayBufferToBase64(data);
    await Word.run(async (context) => {
      const diag = typeof Office !== "undefined" ? Office.context?.diagnostics : undefined;
      const hasWord15 = typeof Office !== "undefined" ? Boolean(Office.context?.requirements?.isSetSupported("WordApi", "1.5")) : false;
      sendDebug(`Word info: host=${diag?.host}, ver=${diag?.version}, plat=${diag?.platform}, WordApi1.5=${hasWord15}`);

      const body = context.document.body;
      let bodyEmpty = false;
      if (typeof body.load === "function") {
        body.load("text");
        await context.sync();
        bodyEmpty = !body.text || body.text.trim().length === 0;
      }
      sendDebug(`Doc body text len: ${body.text?.length || 0}, isEmpty: ${bodyEmpty}`);

      let inserted = false;

      // Method 1: Document.insertFileFromBase64 (WordApi 1.5+) - best for templates with sections/headers/footers
      if (hasWord15 && typeof (context.document as any).insertFileFromBase64 === "function" && bodyEmpty) {
        try {
          sendDebug(`Attempting Method 1: Document.insertFileFromBase64 Replace...`);
          (context.document as any).insertFileFromBase64(base64, "Replace");
          await context.sync();
          sendDebug(`Method 1 (Document.insertFileFromBase64) SUCCEEDED!`);
          inserted = true;
        } catch (err1: any) {
          sendDebug(`Method 1 failed: ${err1?.message} | loc: ${err1?.debugInfo?.errorLocation} | stmt: ${err1?.debugInfo?.statement}`);
        }
      }

      // Method 2: Body.insertFileFromBase64 (isolated sync without select in same batch)
      if (!inserted) {
        try {
          sendDebug(`Attempting Method 2: Body.insertFileFromBase64 End...`);
          const insertedRange = context.document.body.insertFileFromBase64(base64, Word.InsertLocation.end);
          try {
            insertedRange.select();
          } catch {}
          await context.sync();
          sendDebug(`Method 2 (Body.insertFileFromBase64 End) SUCCEEDED!`);
          inserted = true;
        } catch (err2: any) {
          sendDebug(`Method 2 failed: ${err2?.message} | loc: ${err2?.debugInfo?.errorLocation} | stmt: ${err2?.debugInfo?.statement}`);
        }
      }

      // Method 3: Body.insertFileFromBase64 Replace
      if (!inserted) {
        try {
          sendDebug(`Attempting Method 3: Body.insertFileFromBase64 Replace...`);
          context.document.body.insertFileFromBase64(base64, Word.InsertLocation.replace);
          await context.sync();
          sendDebug(`Method 3 (Body.insertFileFromBase64 Replace) SUCCEEDED!`);
          inserted = true;
        } catch (err4: any) {
          sendDebug(`Method 3 failed: ${err4?.message} | loc: ${err4?.debugInfo?.errorLocation} | stmt: ${err4?.debugInfo?.statement}`);
          throw err4;
        }
      }
    });
  } catch (error: any) {
    sendDebug(`insertTemplate ERROR: ${error?.message || String(error)} | code: ${error?.code} | debugInfo: ${JSON.stringify(error?.debugInfo)}`);
    throw error;
  }
}
