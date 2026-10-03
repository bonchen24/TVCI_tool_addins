import { resolveSkeletonType, buildHeaderTableOoxml, buildFooterBlockOoxml, createDocumentSkeleton } from "../../src/word/document-skeleton.service";
import { PRESET_PRESETS } from "../../src/models/document-settings";

const DEFAULT_SETTINGS = PRESET_PRESETS.TVCI;

describe("document-skeleton.service", () => {
  test("resolveSkeletonType maps Vietnamese types correctly", () => {
    expect(resolveSkeletonType("Công văn")).toBe("cong_van");
    expect(resolveSkeletonType("Quyết định ban hành")).toBe("quyet_dinh");
    expect(resolveSkeletonType("Thông báo nội bộ")).toBe("thong_bao");
    expect(resolveSkeletonType("Tờ trình phê duyệt")).toBe("to_trinh");
    expect(resolveSkeletonType("Báo cáo kết quả")).toBe("bao_cao");
    expect(resolveSkeletonType("Biên bản cuộc họp")).toBe("bien_ban");
    expect(resolveSkeletonType("Kế hoạch công tác")).toBe("ke_hoach");
    expect(resolveSkeletonType("Giấy mời họp")).toBe("giay_moi");
    expect(resolveSkeletonType("Văn bản khác")).toBe("cong_van");
  });

  test("buildHeaderTableOoxml contains agency and national motto", () => {
    const xml = buildHeaderTableOoxml(DEFAULT_SETTINGS);
    expect(xml).toContain("CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM");
    expect(xml).toContain("Độc lập - Tự do - Hạnh phúc");
    expect(xml).toContain("Số:");
    expect(xml).toContain(DEFAULT_SETTINGS.agency.issuingAgency.toUpperCase());
    expect(xml).toContain('<w:b/><w:sz w:val="26"/><w:szCs w:val="26"/></w:rPr><w:t>CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</w:t>');
  });

  test("creates a portrait A4 skeleton with standard margins", async () => {
    const pageSetup: Record<string, unknown> = {};
    const paragraph = { font: {}, alignment: null as unknown, spaceBefore: 0, spaceAfter: 0, firstLineIndent: 0, lineSpacing: 0 };
    const body = { insertOoxml: jest.fn(), insertParagraph: jest.fn(() => paragraph) };
    const context = {
      document: { body, sections: { items: [{ pageSetup }], load: jest.fn() } },
      sync: jest.fn(async () => undefined),
    };
    const originalWord = (globalThis as { Word?: unknown }).Word;
    (globalThis as { Word?: unknown }).Word = {
      run: (callback: (value: typeof context) => Promise<void>) => callback(context),
      InsertLocation: { end: "end" },
      Alignment: { left: "left", centered: "centered", justified: "justified" },
    };

    try {
      await createDocumentSkeleton("cong_van", DEFAULT_SETTINGS);
      expect(pageSetup).toMatchObject({
        paperSize: "A4",
        orientation: "Portrait",
        topMargin: 56.7,
        bottomMargin: 56.7,
        leftMargin: 85.05,
        rightMargin: 56.7,
      });
    } finally {
      if (originalWord === undefined) delete (globalThis as { Word?: unknown }).Word;
      else (globalThis as { Word?: unknown }).Word = originalWord;
    }
  });

  test("buildFooterBlockOoxml contains recipients and signer title", () => {
    const xml = buildFooterBlockOoxml(DEFAULT_SETTINGS);
    expect(xml).toContain("Nơi nhận:");
    expect(xml).toContain(DEFAULT_SETTINGS.signer.title.toUpperCase());
  });
});
