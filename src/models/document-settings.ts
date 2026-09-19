export type DocumentSettingsPresetId = "ND30" | "TKV" | "IEMM" | "TVCI" | "PARTY" | "PERSONAL";

export interface DocumentMargins {
  top: number; // in mm
  bottom: number; // in mm
  left: number; // in mm
  right: number; // in mm
}

export interface DocumentParagraphSetup {
  lineSpacing: number; // e.g. 1.3 or 1.5
  lineSpacingRule: "Multiple" | "Exactly" | "AtLeast";
  spaceBefore: number; // in pt, e.g. 0 to 6
  spaceAfter: number; // in pt, e.g. 3 to 6
  firstLineIndent: number; // in mm, e.g. 12.7 (approx 1.27 cm)
}

export interface DocumentTypographySetup {
  fontName: string; // Times New Roman
  headerSize: number; // e.g. 12 or 13 pt
  titleSize: number; // e.g. 14 or 15 pt (bold)
  bodySize: number; // e.g. 13 or 14 pt
  recipientSize: number; // e.g. 11 or 12 pt (italic)
  signerSize: number; // e.g. 13 or 14 pt (bold)
}

export interface DocumentAgencyInfo {
  parentAgency: string; // Cơ quan cấp trên / chủ quản
  issuingAgency: string; // Cơ quan ban hành trực tiếp
  agencyAbbr: string; // Tên viết tắt
}

export interface DocumentSymbolInfo {
  number: string; // Số văn bản
  prefix: string; // Ký hiệu (ví dụ: TVCI-KH, CĐM-VP)
  location: string; // Địa danh (ví dụ: Hà Nội, Cẩm Phả)
  date: string; // Ngày tháng năm
}

export interface DocumentSignerInfo {
  title: string; // Chức vụ (ví dụ: GIÁM ĐỐC, VIỆN TRƯỞNG)
  department?: string; // Đơn vị phòng ban (nếu có)
  fullName: string; // Họ và tên
}

export interface DocumentSettings {
  presetId: DocumentSettingsPresetId;
  docType: string; // CÔNG VĂN, QUYẾT ĐỊNH, TỜ TRÌNH, BÁO CÁO, THÔNG BÁO, GIẤY MỜI
  docTitle: string; // Trích yếu / Tiêu đề văn bản
  agency: DocumentAgencyInfo;
  symbol: DocumentSymbolInfo;
  margins: DocumentMargins;
  paragraph: DocumentParagraphSetup;
  typography: DocumentTypographySetup;
  signer: DocumentSignerInfo;
  recipients: string[];
}

export const SETTINGS_STORAGE_KEY = "tvci_default_document_settings";

/**
 * 1 inch = 25.4 mm = 72 points
 * 1 mm = 72 / 25.4 ≈ 2.83464567 points
 */
export function mmToPoints(mm: number): number {
  return (mm * 72) / 25.4;
}

export function pointsToMm(points: number): number {
  return (points * 25.4) / 72;
}

export const PRESET_PRESETS: Record<DocumentSettingsPresetId, DocumentSettings> = {
  ND30: {
    presetId: "ND30",
    docType: "CÔNG VĂN",
    docTitle: "V/v thực hiện công tác quản lý chuyên môn theo quy định",
    agency: {
      parentAgency: "BỘ CÔNG THƯƠNG",
      issuingAgency: "CỤC QUẢN LÝ",
      agencyAbbr: "CQL",
    },
    symbol: {
      number: "01",
      prefix: "CQL-VP",
      location: "Hà Nội",
      date: "",
    },
    margins: {
      top: 20,
      bottom: 20,
      left: 30,
      right: 15,
    },
    paragraph: {
      lineSpacing: 1.3,
      lineSpacingRule: "Multiple",
      spaceBefore: 0,
      spaceAfter: 6,
      firstLineIndent: 12.7,
    },
    typography: {
      fontName: "Times New Roman",
      headerSize: 12,
      titleSize: 14,
      bodySize: 14,
      recipientSize: 12,
      signerSize: 14,
    },
    signer: {
      title: "CỤC TRƯỞNG",
      fullName: "Nguyễn Văn A",
    },
    recipients: ["Như Kính gửi", "Lưu: VT, VP."],
  },
  TKV: {
    presetId: "TKV",
    docType: "CÔNG VĂN",
    docTitle: "V/v tăng cường kỷ cương an toàn lao động trong toàn Tập đoàn",
    agency: {
      parentAgency: "ỦY BAN QUẢN LÝ VỐN NHÀ NƯỚC TẠI DOANH NGHIỆP",
      issuingAgency: "TẬP ĐOÀN CÔNG NGHIỆP THAN - KHOÁNG SẢN VIỆT NAM",
      agencyAbbr: "TKV",
    },
    symbol: {
      number: "100",
      prefix: "TKV-VP",
      location: "Hà Nội",
      date: "",
    },
    margins: {
      top: 20,
      bottom: 20,
      left: 30,
      right: 15,
    },
    paragraph: {
      lineSpacing: 1.3,
      lineSpacingRule: "Multiple",
      spaceBefore: 0,
      spaceAfter: 6,
      firstLineIndent: 12.7,
    },
    typography: {
      fontName: "Times New Roman",
      headerSize: 12,
      titleSize: 14,
      bodySize: 14,
      recipientSize: 11,
      signerSize: 14,
    },
    signer: {
      title: "TỔNG GIÁM ĐỐC",
      fullName: "Đặng Thanh Hải",
    },
    recipients: ["Các đơn vị thành viên", "HĐTV Tập đoàn (để b/c)", "Lưu: VT, VP."],
  },
  IEMM: {
    presetId: "IEMM",
    docType: "CÔNG VĂN",
    docTitle: "V/v báo cáo tiến độ các đề tài nghiên cứu khoa học công nghệ",
    agency: {
      parentAgency: "TẬP ĐOÀN CÔNG NGHIỆP THAN - KHOÁNG SẢN VIỆT NAM",
      issuingAgency: "VIỆN CƠ ĐIỆN MỎ - VINACOMIN",
      agencyAbbr: "CĐM",
    },
    symbol: {
      number: "15",
      prefix: "CĐM-KHCN",
      location: "Hà Nội",
      date: "",
    },
    margins: {
      top: 20,
      bottom: 20,
      left: 30,
      right: 15,
    },
    paragraph: {
      lineSpacing: 1.3,
      lineSpacingRule: "Multiple",
      spaceBefore: 0,
      spaceAfter: 6,
      firstLineIndent: 12.7,
    },
    typography: {
      fontName: "Times New Roman",
      headerSize: 12,
      titleSize: 14,
      bodySize: 14,
      recipientSize: 11,
      signerSize: 14,
    },
    signer: {
      title: "VIỆN TRƯỞNG",
      fullName: "Trần Tú Ba",
    },
    recipients: ["Tập đoàn TKV (để b/c)", "Các phòng, trung tâm thuộc Viện", "Lưu: VT, KHCN."],
  },
  TVCI: {
    presetId: "TVCI",
    docType: "CÔNG VĂN",
    docTitle: "V/v triển khai thử nghiệm giải pháp tự động hóa và cơ điện mỏ",
    agency: {
      parentAgency: "VIỆN CƠ ĐIỆN MỎ - VINACOMIN",
      issuingAgency: "TRUNG TÂM PHÁT TRIỂN CÔNG NGHỆ VÀ THIẾT BỊ CƠ ĐIỆN",
      agencyAbbr: "TVCI",
    },
    symbol: {
      number: "26",
      prefix: "TVCI",
      location: "Hà Nội",
      date: "",
    },
    margins: {
      top: 20,
      bottom: 20,
      left: 30,
      right: 15,
    },
    paragraph: {
      lineSpacing: 1.3,
      lineSpacingRule: "Multiple",
      spaceBefore: 0,
      spaceAfter: 6,
      firstLineIndent: 12.7,
    },
    typography: {
      fontName: "Times New Roman",
      headerSize: 12,
      titleSize: 14,
      bodySize: 14,
      recipientSize: 11,
      signerSize: 14,
    },
    signer: {
      title: "GIÁM ĐỐC",
      fullName: "Nguyễn Văn B",
    },
    recipients: ["Viện Cơ điện Mỏ (để b/c)", "Các đơn vị đối tác", "Lưu: VT, TVCI."],
  },
  PARTY: {
    presetId: "PARTY",
    docType: "NGHỊ QUYẾT",
    docTitle: "V/v nâng cao chất lượng sinh hoạt chi bộ và công tác phát triển đảng viên",
    agency: {
      parentAgency: "ĐẢNG CỘNG SẢN VIỆT NAM",
      issuingAgency: "ĐẢNG ỦY VIỆN CƠ ĐIỆN MỎ",
      agencyAbbr: "ĐU",
    },
    symbol: {
      number: "05",
      prefix: "NQ/ĐU",
      location: "Hà Nội",
      date: "",
    },
    margins: {
      top: 20,
      bottom: 20,
      left: 30,
      right: 15,
    },
    paragraph: {
      lineSpacing: 1.3,
      lineSpacingRule: "Multiple",
      spaceBefore: 0,
      spaceAfter: 6,
      firstLineIndent: 12.7,
    },
    typography: {
      fontName: "Times New Roman",
      headerSize: 13,
      titleSize: 14,
      bodySize: 14,
      recipientSize: 11,
      signerSize: 14,
    },
    signer: {
      title: "BÍ THƯ",
      fullName: "Trần Tú Ba",
    },
    recipients: ["Đảng ủy Tập đoàn TKV", "Các chi bộ trực thuộc", "Lưu: Văn phòng Đảng ủy."],
  },
  PERSONAL: {
    presetId: "PERSONAL",
    docType: "CÔNG VĂN",
    docTitle: "Văn bản tùy chỉnh cá nhân",
    agency: {
      parentAgency: "",
      issuingAgency: "ĐƠN VỊ SOẠN THẢO",
      agencyAbbr: "VP",
    },
    symbol: {
      number: "01",
      prefix: "CV",
      location: "Hà Nội",
      date: "",
    },
    margins: {
      top: 20,
      bottom: 20,
      left: 30,
      right: 15,
    },
    paragraph: {
      lineSpacing: 1.3,
      lineSpacingRule: "Multiple",
      spaceBefore: 0,
      spaceAfter: 6,
      firstLineIndent: 12.7,
    },
    typography: {
      fontName: "Times New Roman",
      headerSize: 12,
      titleSize: 14,
      bodySize: 14,
      recipientSize: 11,
      signerSize: 14,
    },
    signer: {
      title: "NGƯỜI KÝ",
      fullName: "",
    },
    recipients: ["Như Kính gửi", "Lưu: VT."],
  },
};

export function getDefaultSettings(presetId: DocumentSettingsPresetId = "TVCI"): DocumentSettings {
  const preset = PRESET_PRESETS[presetId] || PRESET_PRESETS.TVCI;
  return JSON.parse(JSON.stringify(preset));
}

export function loadSavedSettings(): DocumentSettings {
  try {
    if (typeof localStorage !== "undefined") {
      const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === "object" && parsed.margins) {
          return parsed as DocumentSettings;
        }
      }
    }
  } catch (err) {
    console.warn("Could not load document settings from localStorage:", err);
  }
  return getDefaultSettings("TVCI");
}

export function saveDefaultSettings(settings: DocumentSettings): void {
  try {
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
    }
  } catch (err) {
    console.error("Failed to save document settings to localStorage:", err);
  }
}

export function validateDocumentSettings(settings: DocumentSettings): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!settings.margins) {
    errors.push("Thiếu thông số căn lề.");
  } else {
    const { top, bottom, left, right } = settings.margins;
    if (top < 10 || top > 50) errors.push("Lề trên phải nằm trong khoảng 10mm - 50mm.");
    if (bottom < 10 || bottom > 50) errors.push("Lề dưới phải nằm trong khoảng 10mm - 50mm.");
    if (left < 15 || left > 60) errors.push("Lề trái phải nằm trong khoảng 15mm - 60mm.");
    if (right < 10 || right > 40) errors.push("Lề phải phải nằm trong khoảng 10mm - 40mm.");
  }

  if (settings.typography) {
    const { bodySize } = settings.typography;
    if (bodySize < 9 || bodySize > 24) {
      errors.push("Cỡ chữ nội dung nên từ 9pt đến 24pt (chuẩn NĐ30 là 13-14pt).");
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Applies margin and paragraph settings to active Word document
 */
export async function applySettingsToWord(settings: DocumentSettings): Promise<void> {
  if (typeof Word === "undefined") {
    console.log("Word API not available (Browser environment)");
    return;
  }

  await Word.run(async (context) => {
    const sections = context.document.sections;
    sections.load("items");
    await context.sync();

    const topPoints = mmToPoints(settings.margins.top);
    const bottomPoints = mmToPoints(settings.margins.bottom);
    const leftPoints = mmToPoints(settings.margins.left);
    const rightPoints = mmToPoints(settings.margins.right);

    for (const section of sections.items) {
      const pageSetup = section.pageSetup;
      pageSetup.topMargin = topPoints;
      pageSetup.bottomMargin = bottomPoints;
      pageSetup.leftMargin = leftPoints;
      pageSetup.rightMargin = rightPoints;
    }

    // Set font and paragraph for selected range or entire document body if nothing selected
    const body = context.document.body;
    body.font.name = settings.typography.fontName || "Times New Roman";

    await context.sync();
  });
}

/**
 * Saves as default and immediately applies to active document
 */
export async function saveAndApplySettings(settings: DocumentSettings): Promise<void> {
  saveDefaultSettings(settings);
  await applySettingsToWord(settings);
}
