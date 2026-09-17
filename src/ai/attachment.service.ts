import JSZip from "jszip";

export type AiAttachmentType = "pdf" | "word" | "image" | "unknown";

export interface AiAttachment {
  id: string;
  name: string;
  type: AiAttachmentType;
  mimeType: string;
  size: number;
  base64?: string;
  dataUrl?: string;
  extractedText?: string;
}

export function detectAttachmentType(fileName: string, mimeType = ""): AiAttachmentType {
  const lowerName = fileName.toLowerCase();
  const lowerMime = mimeType.toLowerCase();

  if (lowerName.endsWith(".pdf") || lowerMime === "application/pdf") {
    return "pdf";
  }
  if (
    lowerName.endsWith(".docx") ||
    lowerName.endsWith(".doc") ||
    lowerMime.includes("word") ||
    lowerMime.includes("officedocument")
  ) {
    return "word";
  }
  if (
    lowerName.endsWith(".png") ||
    lowerName.endsWith(".jpg") ||
    lowerName.endsWith(".jpeg") ||
    lowerName.endsWith(".webp") ||
    lowerMime.startsWith("image/")
  ) {
    return "image";
  }
  return "unknown";
}

export function extractTextFromDocxXml(docXml: string): string {
  const paragraphs = docXml.match(/<w:p\b[^>]*>[\s\S]*?<\/w:p>/g) || [];
  const lines: string[] = [];

  for (const p of paragraphs) {
    const textMatches = p.match(/<w:t\b[^>]*>([\s\S]*?)<\/w:t>/g);
    if (!textMatches) continue;
    let line = "";
    for (const t of textMatches) {
      const match = /<w:t\b[^>]*>([\s\S]*?)<\/w:t>/.exec(t);
      if (match && match[1]) {
        line += match[1]
          .replace(/&amp;/g, "&")
          .replace(/&lt;/g, "<")
          .replace(/&gt;/g, ">")
          .replace(/&quot;/g, '"')
          .replace(/&apos;/g, "'");
      }
    }
    const trimmed = line.trim();
    if (trimmed) lines.push(trimmed);
  }

  return lines.join("\n");
}

export async function extractTextFromDocxArrayBuffer(buffer: ArrayBuffer): Promise<string> {
  const zip = await JSZip.loadAsync(buffer);
  const docXml = await zip.file("word/document.xml")?.async("string");
  if (!docXml) return "";
  return extractTextFromDocxXml(docXml);
}

export function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("Không thể đọc tệp."));
    reader.readAsDataURL(file);
  });
}

export async function processAttachmentFile(file: File): Promise<AiAttachment> {
  const type = detectAttachmentType(file.name, file.type);
  const id = `${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  const attachment: AiAttachment = {
    id,
    name: file.name,
    type,
    mimeType: file.type || (type === "pdf" ? "application/pdf" : type === "image" ? "image/jpeg" : "application/octet-stream"),
    size: file.size,
  };

  if (type === "word") {
    try {
      const buffer = await file.arrayBuffer();
      const extractedText = await extractTextFromDocxArrayBuffer(buffer);
      attachment.extractedText = extractedText;
    } catch (e) {
      console.warn("Failed to extract word text:", e);
    }
  } else if (type === "image" || type === "pdf") {
    const dataUrl = await readFileAsDataUrl(file);
    attachment.dataUrl = dataUrl;
    const commaIdx = dataUrl.indexOf(",");
    attachment.base64 = commaIdx >= 0 ? dataUrl.substring(commaIdx + 1) : dataUrl;
  }

  return attachment;
}
