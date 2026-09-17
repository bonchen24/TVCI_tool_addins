import { detectAttachmentType, extractTextFromDocxArrayBuffer, type AiAttachment } from "../../src/ai/attachment.service";
import JSZip from "jszip";

describe("Attachment Service", () => {
  test("detectAttachmentType identifies PDF, Word, and Image correctly", () => {
    expect(detectAttachmentType("report.pdf", "application/pdf")).toBe("pdf");
    expect(detectAttachmentType("doc.docx", "application/vnd.openxmlformats-officedocument.wordprocessingml.document")).toBe("word");
    expect(detectAttachmentType("scan.png", "image/png")).toBe("image");
    expect(detectAttachmentType("photo.jpeg", "image/jpeg")).toBe("image");
    expect(detectAttachmentType("unknown.xyz", "application/octet-stream")).toBe("unknown");
  });

  test("extractTextFromDocxArrayBuffer extracts paragraphs from docx document.xml", async () => {
    const zip = new JSZip();
    const docXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
    <w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
      <w:body>
        <w:p><w:r><w:t>Kính gửi: Ban Lãnh đạo Viện</w:t></w:r></w:p>
        <w:p><w:r><w:t>V/v phê duyệt kế hoạch công tác</w:t></w:r></w:p>
      </w:body>
    </w:document>`;
    zip.file("word/document.xml", docXml);
    const buffer = await zip.generateAsync({ type: "arraybuffer" });

    const text = await extractTextFromDocxArrayBuffer(buffer);
    expect(text).toContain("Kính gửi: Ban Lãnh đạo Viện");
    expect(text).toContain("V/v phê duyệt kế hoạch công tác");
  });
});
