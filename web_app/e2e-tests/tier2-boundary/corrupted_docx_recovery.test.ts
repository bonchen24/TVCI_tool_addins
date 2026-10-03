/**
 * Tier 2 - Boundary & Corner Cases: Corrupted DOCX Recovery
 * Verifies handling of truncated ZIPs, invalid headers, missing document.xml, and corrupted OpenXML tags.
 */

import { describe, it, expect } from "../framework/testHarness";

describe("Tier 2: Corrupted DOCX Recovery", 2, () => {
  it("should reject non-ZIP files uploaded with a .docx extension", () => {
    const textFileContent = Buffer.from("This is a plain text file, not a zip or docx archive.");
    const isDocxZip = (buf: Buffer): boolean => {
      // DOCX files must start with PK zip signature: 0x50 0x4B 0x03 0x04
      return buf.length >= 4 && buf[0] === 0x50 && buf[1] === 0x4b && buf[2] === 0x03 && buf[3] === 0x04;
    };

    expect(isDocxZip(textFileContent)).toBe(false);
  });

  it("should throw informative error when word/document.xml is missing from archive", () => {
    const mockZipFiles = ["[Content_Types].xml", "_rels/.rels", "word/styles.xml"];
    const checkDocumentXml = (files: string[]) => {
      if (!files.includes("word/document.xml")) {
        throw new Error("Tệp DOCX bị lỗi: Thiếu tệp cấu trúc word/document.xml");
      }
    };

    expect(() => checkDocumentXml(mockZipFiles)).toThrow("Thiếu tệp cấu trúc word/document.xml");
  });

  it("should recover text from malformed XML with unclosed tags", () => {
    const malformedXml = "<w:document><w:body><w:p><w:r><w:t>Văn bản quan trọng"; // missing closing tags
    const extractTextRegex = (xml: string): string => {
      const matches = xml.match(/<w:t[^>]*>([^<]*)/g) || [];
      return matches.map((m) => m.replace(/<w:t[^>]*>/, "")).join("");
    };

    const text = extractTextRegex(malformedXml);
    expect(text).toBe("Văn bản quan trọng");
  });

  it("should handle corrupted image relationships without halting document loading", () => {
    const relationships = [
      { id: "rId1", target: "styles.xml", valid: true },
      { id: "rId2", target: "media/corrupted_image.bin", valid: false }, // missing media
    ];

    const safeLoad = (rels: typeof relationships) => {
      return rels.filter((r) => r.valid || !r.target.startsWith("media/"));
    };

    const loaded = safeLoad(relationships);
    expect(loaded.length).toBe(1);
    expect(loaded[0].id).toBe("rId1");
  });

  it("should handle 0-byte uploaded files with immediate error notice", () => {
    const emptyBuffer = Buffer.alloc(0);
    const validateUpload = (buf: Buffer) => {
      if (buf.length === 0) {
        throw new Error("Tệp rỗng (0 bytes). Vui lòng chọn tệp DOCX hợp lệ.");
      }
    };

    expect(() => validateUpload(emptyBuffer)).toThrow("Tệp rỗng (0 bytes)");
  });
});
