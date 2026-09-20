import {
  getDefaultSettings,
  loadSavedSettings,
  saveDefaultSettings,
  mmToPoints,
  pointsToMm,
  validateDocumentSettings,
  type DocumentSettings,
} from "../../src/models/document-settings";

describe("Document Settings Model & Presets", () => {
  let mockStorage: Record<string, string>;

  beforeEach(() => {
    mockStorage = {};
    const storageMock = {
      getItem: (key: string) => mockStorage[key] ?? null,
      setItem: (key: string, value: string) => {
        mockStorage[key] = value;
      },
      removeItem: (key: string) => {
        delete mockStorage[key];
      },
      clear: () => {
        mockStorage = {};
      },
    };
    Object.defineProperty(global, "localStorage", {
      value: storageMock,
      writable: true,
    });
  });

  describe("Unit conversion utilities", () => {
    it("converts mm to points accurately", () => {
      // 1 mm = 72 / 25.4 points ≈ 2.83464567 points
      const pts20mm = mmToPoints(20);
      expect(Math.round(pts20mm * 10) / 10).toBe(56.7);

      const pts30mm = mmToPoints(30);
      expect(Math.round(pts30mm * 10) / 10).toBe(85.0);
    });

    it("converts points to mm accurately", () => {
      const mm = pointsToMm(56.69);
      expect(Math.round(mm)).toBe(20);
    });
  });

  describe("Preset retrieval", () => {
    it("returns standard ND30 preset compliant with Decree 30/2020/ND-CP", () => {
      const s = getDefaultSettings("ND30");
      expect(s.presetId).toBe("ND30");
      expect(s.margins.top).toBe(20);
      expect(s.margins.bottom).toBe(20);
      expect(s.margins.left).toBe(30);
      expect(s.margins.right).toBe(15);
      expect(s.typography.fontName).toBe("Times New Roman");
      expect(s.typography.bodySize).toBe(14);
      expect(s.paragraph.lineSpacing).toBe(1.3);
      expect(s.paragraph.firstLineIndent).toBe(12.7);
    });

    it("returns TVCI preset with proper organization naming", () => {
      const s = getDefaultSettings("TVCI");
      expect(s.presetId).toBe("TVCI");
      expect(s.agency.issuingAgency).toContain("TRUNG TÂM THỬ NGHIỆM - KIỂM ĐỊNH CÔNG NGHIỆP");
      expect(s.agency.agencyAbbr).toBe("TVCI");
      expect(s.symbol.prefix).toBe("TVCI");
    });

    it("returns IEMM preset with institute naming", () => {
      const s = getDefaultSettings("IEMM");
      expect(s.presetId).toBe("IEMM");
      expect(s.agency.issuingAgency).toContain("VIỆN CƠ KHÍ NĂNG LƯỢNG VÀ MỎ - VINACOMIN");
      expect(s.agency.parentAgency).toContain("TẬP ĐOÀN CÔNG NGHIỆP THAN - KHOÁNG SẢN");
    });

    it("returns PARTY preset without national motto and with party structure", () => {
      const s = getDefaultSettings("PARTY");
      expect(s.presetId).toBe("PARTY");
      expect(s.agency.parentAgency).toContain("ĐẢNG CỘNG SẢN VIỆT NAM");
    });
  });

  describe("Settings Persistence", () => {
    it("saves and loads settings from localStorage", () => {
      const custom: DocumentSettings = {
        ...getDefaultSettings("TVCI"),
        docType: "BÁO CÁO",
        docTitle: "Báo cáo tổng kết công tác năm",
        margins: { top: 25, bottom: 20, left: 30, right: 20 },
      };

      saveDefaultSettings(custom);
      const loaded = loadSavedSettings();
      expect(loaded.docType).toBe("BÁO CÁO");
      expect(loaded.docTitle).toBe("Báo cáo tổng kết công tác năm");
      expect(loaded.margins.top).toBe(25);
    });

    it("falls back to TVCI preset when storage is empty", () => {
      const loaded = loadSavedSettings();
      expect(loaded.presetId).toBe("TVCI");
    });
  });

  describe("Validation", () => {
    it("validates margins within acceptable limits", () => {
      const valid = getDefaultSettings("ND30");
      expect(validateDocumentSettings(valid).isValid).toBe(true);

      const invalidMargins: DocumentSettings = {
        ...valid,
        margins: { top: 5, bottom: 20, left: 30, right: 15 }, // Top 5mm is too small
      };
      const result = validateDocumentSettings(invalidMargins);
      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.includes("Lề"))).toBe(true);
    });
  });
});
