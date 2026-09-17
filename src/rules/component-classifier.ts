export type DocumentFamily = "ADMINISTRATIVE" | "PARTY";

export type DocumentComponentType =
  | "NATIONAL_EMBLEM"
  | "MOTTO"
  | "PARTY_TITLE"
  | "AGENCY_NAME"
  | "NUMBER_SYMBOL"
  | "PLACE_DATE"
  | "DOCUMENT_TYPE"
  | "ABSTRACT"
  | "LEGAL_BASIS"
  | "ADDRESSEE"
  | "RECIPIENTS"
  | "SIGNER_ROLE";

export interface ClassifiedComponent {
  paragraphIndex: number;
  type: DocumentComponentType;
  label: string;
  confidence: number;
}

const LABELS: Record<DocumentComponentType, string> = {
  NATIONAL_EMBLEM: "Quốc hiệu",
  MOTTO: "Tiêu ngữ",
  PARTY_TITLE: "Tiêu đề Đảng Cộng sản Việt Nam",
  AGENCY_NAME: "Tên cơ quan ban hành",
  NUMBER_SYMBOL: "Số, ký hiệu",
  PLACE_DATE: "Địa danh và ngày tháng",
  DOCUMENT_TYPE: "Tên loại văn bản",
  ABSTRACT: "Trích yếu nội dung",
  LEGAL_BASIS: "Căn cứ ban hành",
  ADDRESSEE: "Kính gửi",
  RECIPIENTS: "Nơi nhận",
  SIGNER_ROLE: "Quyền hạn / chức vụ người ký",
};

const DOCUMENT_TYPES = new Set([
  "NGHỊ QUYẾT", "QUYẾT ĐỊNH", "CHỈ THỊ", "QUY ĐỊNH", "QUY CHẾ", "THÔNG BÁO",
  "KẾ HOẠCH", "BÁO CÁO", "TỜ TRÌNH", "BIÊN BẢN", "CÔNG VĂN", "HƯỚNG DẪN",
  "CHƯƠNG TRÌNH", "ĐỀ ÁN", "PHƯƠNG ÁN", "GIẤY MỜI", "GIẤY ỦY QUYỀN",
]);

function normalize(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

function isUppercaseVietnamese(text: string): boolean {
  const letters = text.replace(/[^A-Za-zÀ-ỹĐđ]/g, "");
  return letters.length >= 4 && text === text.toLocaleUpperCase("vi-VN");
}

function isPlaceDate(text: string): boolean {
  return /,\s*ngày\s+\d{1,2}\s+tháng\s+\d{1,2}\s+năm\s+\d{4}/i.test(text)
    || /,\s*ngày\s+.*\s+tháng\s+.*\s+năm\s+\d{4}/i.test(text);
}

function isSignerRole(text: string): boolean {
  if (!isUppercaseVietnamese(text) || text.length > 80) return false;
  return /^(T\/M|TM\.|KT\.|TL\.|TUQ\.|Q\.|PHÓ |GIÁM ĐỐC|PHÓ GIÁM ĐỐC|CHỦ TỊCH|PHÓ CHỦ TỊCH|BÍ THƯ|PHÓ BÍ THƯ|CHÁNH VĂN PHÒNG|TRƯỞNG |PHÓ TRƯỞNG )/i.test(text);
}

function add(result: ClassifiedComponent[], paragraphIndex: number, type: DocumentComponentType, confidence = 1): void {
  if (result.some((item) => item.paragraphIndex === paragraphIndex && item.type === type)) return;
  result.push({ paragraphIndex, type, label: LABELS[type], confidence });
}

export function classifyDocumentComponents(paragraphs: string[], family: DocumentFamily): ClassifiedComponent[] {
  const lines = paragraphs.map(normalize);
  const result: ClassifiedComponent[] = [];
  let documentTypeIndex = -1;

  lines.forEach((text, index) => {
    if (!text) return;
    const upper = text.toLocaleUpperCase("vi-VN");

    if (family === "ADMINISTRATIVE") {
      if (upper.includes("CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM") || upper.includes("CỘNG HOÀ XÃ HỘI CHỦ NGHĨA VIỆT NAM")) {
        add(result, index, "NATIONAL_EMBLEM"); return;
      }
      if (/^ĐỘC LẬP\s*[-–—]\s*TỰ DO\s*[-–—]\s*HẠNH PHÚC$/i.test(upper)) {
        add(result, index, "MOTTO"); return;
      }
    } else if (upper === "ĐẢNG CỘNG SẢN VIỆT NAM") {
      add(result, index, "PARTY_TITLE"); return;
    }

    if (/^SỐ\s*:?.{0,80}$/i.test(text) && /\d/.test(text)) {
      add(result, index, "NUMBER_SYMBOL", 0.98); return;
    }
    if (isPlaceDate(text)) {
      add(result, index, "PLACE_DATE", 0.98); return;
    }
    if (DOCUMENT_TYPES.has(upper)) {
      add(result, index, "DOCUMENT_TYPE", 0.99);
      documentTypeIndex = index;
      return;
    }
    if (/^CĂN CỨ(?:\s|$)/i.test(text)) {
      add(result, index, "LEGAL_BASIS", 0.99); return;
    }
    if (/^KÍNH GỬI\s*:?/i.test(upper)) {
      add(result, index, "ADDRESSEE", 0.99); return;
    }
    if (/^NƠI NHẬN(?:\s*:\s*.*|\s+.*)?$/i.test(upper)) {
      add(result, index, "RECIPIENTS", 0.99); return;
    }
    if (isSignerRole(text)) {
      add(result, index, "SIGNER_ROLE", 0.9); return;
    }

    if (family === "PARTY" && index < 6 && isUppercaseVietnamese(text) && /^(ĐẢNG BỘ|ĐẢNG ỦY|ĐẢNG UỶ|CHI BỘ|BAN |VĂN PHÒNG|ỦY BAN|UỶ BAN)/.test(upper)) {
      add(result, index, "AGENCY_NAME", 0.85); return;
    }
    if (family === "ADMINISTRATIVE" && index < 6 && isUppercaseVietnamese(text) && !DOCUMENT_TYPES.has(upper)) {
      add(result, index, "AGENCY_NAME", 0.7);
    }
  });

  if (documentTypeIndex >= 0) {
    for (let index = documentTypeIndex + 1; index < Math.min(lines.length, documentTypeIndex + 4); index += 1) {
      const text = lines[index];
      if (!text) continue;
      const already = result.some((item) => item.paragraphIndex === index);
      if (!already && !/^Điều\s+\d+/i.test(text) && text.length <= 220) {
        add(result, index, "ABSTRACT", 0.82);
        break;
      }
    }
  }

  return result.sort((a, b) => a.paragraphIndex - b.paragraphIndex);
}
