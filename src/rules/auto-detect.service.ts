import type { RuleProfileId } from "./profiles";

export interface AutoDetectResult {
  detectedOrg: "TVCI" | "IEMM" | "DANG" | "TKV";
  orgLabel: string;
  documentType: string;
  ruleProfileId: RuleProfileId;
  ruleProfileName: string;
  confidence: number; // 0.0 to 1.0
  rationale: string[];
}

export function removeTones(str: string): string {
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .trim();
}

const SPECIFIC_DOC_TITLES: Array<{ type: string; titles: string[] }> = [
  { type: "Quyết định", titles: ["quyet dinh", "ve viec phe duyet", "ve viec ban hanh"] },
  { type: "Tờ trình", titles: ["to trinh", "to trinh ve viec", "kinh trinh"] },
  { type: "Biên bản", titles: ["bien ban", "bien ban nghiem thu", "bien ban kiem dinh", "bien ban lam viec"] },
  { type: "Thông báo", titles: ["thong bao", "thong bao ve viec", "thong bao ket luan"] },
  { type: "Báo cáo", titles: ["bao cao", "bao cao ket qua", "bao cao tinh hinh", "bao cao dinh ky"] },
  { type: "Kế hoạch", titles: ["ke hoach", "ke hoach thuc hien", "ke hoach cong tac"] },
  { type: "Giấy giới thiệu", titles: ["giay gioi thieu", "kinh gioi thieu"] },
  { type: "Công văn", titles: ["cong van", "v/v", "ve viec", "kinh gui"] },
];

/**
 * Automatically inspects the document structure and text paragraphs to detect
 * organization level (TVCI, IEMM, DANG, TKV), document type and matching rule profile.
 */
export function detectDocumentContext(paragraphs: string[]): AutoDetectResult {
  if (!paragraphs || paragraphs.length === 0) {
    return {
      detectedOrg: "TVCI",
      orgLabel: "Trung tâm Thử nghiệm - Kiểm định Công nghiệp",
      documentType: "Văn bản hành chính",
      ruleProfileId: "NĐ30_TVCI",
      ruleProfileName: "NĐ30 / Trung tâm Thử nghiệm - Kiểm định Công nghiệp",
      confidence: 0.5,
      rationale: ["Văn bản chưa có nội dung hoặc mới tạo; mặc định áp dụng chuẩn TVCI / Nghị định 30."],
    };
  }

  const rationale: string[] = [];
  let detectedOrg: "TVCI" | "IEMM" | "DANG" | "TKV" = "TVCI";
  let ruleProfileId: RuleProfileId = "NĐ30_TVCI";
  let confidenceScore = 0.5;

  // Inspect first 20 paragraphs for headers, symbols, titles
  const sample = paragraphs.slice(0, 20);
  const sampleFullText = sample.join("\n");
  const normalizedText = removeTones(sampleFullText);

  // 1. Detect Party (Đảng)
  if (
    normalizedText.includes("dang bo") ||
    normalizedText.includes("dang uy") ||
    normalizedText.includes("chi bo") ||
    normalizedText.includes("dang cong san viet nam") ||
    /-\s*bc\/du/i.test(sampleFullText) ||
    /-\s*qd\/du/i.test(sampleFullText)
  ) {
    detectedOrg = "DANG";
    ruleProfileId = "DANG_05_HD_VPTW_2026";
    confidenceScore += 0.45;
    rationale.push("Phát hiện tiêu đề hoặc ký hiệu Đảng bộ / Chi bộ / Đảng ủy.");
  }
  // 2. Detect TVCI (Center)
  else if (
    normalizedText.includes("trung tam thu nghiem") ||
    normalizedText.includes("kiem dinh cong nghiep") ||
    /\/tvci/i.test(sampleFullText)
  ) {
    detectedOrg = "TVCI";
    ruleProfileId = "NĐ30_TVCI";
    confidenceScore += 0.46;
    rationale.push("Phát hiện đơn vị cấp Trung tâm: Trung tâm Thử nghiệm - Kiểm định Công nghiệp (TVCI).");
  }
  // 3. Detect IEMM (Institute)
  else if (
    normalizedText.includes("vien co khi nang luong va mo") ||
    /\/cknlm/i.test(sampleFullText) ||
    normalizedText.includes("vien truong vien co khi")
  ) {
    detectedOrg = "IEMM";
    ruleProfileId = "IEMM";
    confidenceScore += 0.45;
    rationale.push("Phát hiện đơn vị cấp Viện: Viện Cơ khí Năng lượng và Mỏ - Vinacomin (IEMM).");
  }
  // 4. Detect TKV
  else if (
    normalizedText.includes("tap doan cong nghiep than") ||
    normalizedText.includes("vinacomin")
  ) {
    detectedOrg = "TVCI";
    ruleProfileId = "NĐ30_TVCI";
    confidenceScore += 0.35;
    rationale.push("Phát hiện thuộc Tập đoàn Vinacomin; quy cách chuẩn NĐ30 / TVCI.");
  }

  // Detect Document Type: check standalone title paragraphs first
  let detectedType = "Công văn";
  let docTypeFound = false;

  for (const p of sample) {
    const cleanP = removeTones(p);
    for (const doc of SPECIFIC_DOC_TITLES) {
      if (cleanP === doc.type.toLowerCase() || doc.titles.some((t) => cleanP === t)) {
        detectedType = doc.type;
        docTypeFound = true;
        confidenceScore += 0.08;
        rationale.push(`Phát hiện tiêu đề văn bản: "${doc.type}".`);
        break;
      }
    }
    if (docTypeFound) break;
  }

  // If no standalone title matched, search across text
  if (!docTypeFound) {
    for (const doc of SPECIFIC_DOC_TITLES) {
      for (const kw of doc.titles) {
        if (normalizedText.includes(kw)) {
          detectedType = doc.type;
          docTypeFound = true;
          confidenceScore += 0.05;
          rationale.push(`Phát hiện từ khóa loại văn bản: "${doc.type}".`);
          break;
        }
      }
      if (docTypeFound) break;
    }
  }

  // Cap confidence at 0.98
  const finalConfidence = Math.min(0.98, Math.max(0.4, Math.round(confidenceScore * 100) / 100));

  const orgLabels: Record<string, string> = {
    TVCI: "Trung tâm Thử nghiệm - Kiểm định Công nghiệp",
    IEMM: "Viện Cơ khí Năng lượng và Mỏ - Vinacomin",
    DANG: "Văn bản Đảng ủy / Chi bộ",
    TKV: "Tập đoàn Vinacomin",
  };

  const profileNames: Record<RuleProfileId, string> = {
    NĐ30_TVCI: "NĐ30 / Trung tâm Thử nghiệm - Kiểm định Công nghiệp",
    IEMM: "Viện Cơ khí Năng lượng và Mỏ - Vinacomin",
    DANG_05_HD_VPTW_2026: "Văn bản Đảng 05-HD/VPTW",
    TKV: "TKV (Quy định nội bộ)",
  };

  return {
    detectedOrg,
    orgLabel: orgLabels[detectedOrg] || detectedOrg,
    documentType: detectedType,
    ruleProfileId,
    ruleProfileName: profileNames[ruleProfileId] || ruleProfileId,
    confidence: finalConfidence,
    rationale,
  };
}
