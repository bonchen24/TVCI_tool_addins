/**
 * TVCI Administrative Document Formatting Utilities
 * Adheres strictly to QUY CÁCH TRÌNH BÀY VĂN BẢN HÀNH CHÍNH TVCI (15 điều khoản).
 */

/**
 * VI. NGÀY, THÁNG, NĂM
 * - Ngày < 10: thêm số 0 ở trước (01, 02, ..., 09)
 * - Tháng 1, 2: thêm số 0 ở trước (01, 02)
 * - Tháng 3 đến 12: KHÔNG thêm số 0 (3, 4, ..., 12)
 * Mẫu: "Hà Nội, ngày 09 tháng 9 năm 2026"
 */
export function formatTvciDate(day: number | string, month: number | string, year: number | string, place = "Hà Nội"): string {
  const d = parseInt(String(day), 10);
  const m = parseInt(String(month), 10);
  const y = parseInt(String(year), 10);

  if (isNaN(d) || isNaN(m) || isNaN(y)) {
    return `${place}, ngày … tháng … năm …`;
  }

  const dayStr = d < 10 ? `0${d}` : `${d}`;
  const monthStr = m === 1 || m === 2 ? `0${m}` : `${m}`;
  const yearStr = `${y}`;

  return `${place}, ngày ${dayStr} tháng ${monthStr} năm ${yearStr}`;
}

/**
 * Parses and formats an arbitrary date string or Date object according to TVCI rules.
 */
export function parseAndFormatTvciDate(input: string | Date, place = "Hà Nội"): string {
  if (input instanceof Date) {
    return formatTvciDate(input.getDate(), input.getMonth() + 1, input.getFullYear(), place);
  }

  const str = String(input ?? "").trim();
  if (!str) return `${place}, ngày … tháng … năm …`;

  // Check if it already matches "..., ngày DD tháng MM năm YYYY"
  const match = str.match(/(?:(.*),\s*)?ngày\s+(\d{1,2})\s+tháng\s+(\d{1,2})\s+năm\s+(\d{4})/i);
  if (match) {
    const p = match[1]?.trim() || place;
    return formatTvciDate(match[2], match[3], match[4], p);
  }

  // Check ISO format YYYY-MM-DD
  const isoMatch = str.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (isoMatch) {
    return formatTvciDate(isoMatch[3], isoMatch[2], isoMatch[1], place);
  }

  // Check DD/MM/YYYY
  const slashMatch = str.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (slashMatch) {
    return formatTvciDate(slashMatch[1], slashMatch[2], slashMatch[3], place);
  }

  return str;
}

/**
 * V. PHẦN V/V HOẶC VỀ VIỆC (Trích yếu)
 * - Sau "V/v" hoặc "Về việc" TUYỆT ĐỐI không có dấu hai chấm (:).
 * - Không viết hoa chữ cái đầu tiên sau "V/v" hoặc "Về việc" (viết thường chữ cái đầu).
 * - Không được lặp tiền tố: "V/v V/v...", "V/v:...", "Về việc:..."
 */
export function formatTvciSubject(rawSubject: string, defaultPrefix: "V/v" | "Về việc" = "V/v"): string {
  let content = String(rawSubject ?? "").trim();
  if (!content) return "";

  // Detect whether "Về việc" was used in the original text
  const isVeViec = /^(?:về việc|ve viec)\b/i.test(content);
  const prefix = isVeViec ? "Về việc" : defaultPrefix;

  // Strip repeated V/v, V/v:, Về việc, Về việc:, Trích yếu, Trích yếu:
  content = content.replace(/^(?:(?:v\/v|về việc|ve viec|trích yếu|trich yeu)[:\s]*)+/gi, "").trim();

  if (!content) return "";

  // Lowercase first letter per user requirement: không viết hoa chữ cái đầu
  content = content.charAt(0).toLocaleLowerCase("vi-VN") + content.slice(1);

  return `${prefix} ${content}`;
}

/**
 * IV. PHẦN SỐ VÀ KÝ HIỆU
 * Mẫu: "Số:         /VCKM-TB"
 * - Cụm "Số:" căn giữa cột trái.
 * - Có khoảng trống đủ rộng sau "Số:" để điền bằng tay trước dấu "/".
 * - Không được hiển thị thành "Số: /VCKM-TB".
 */
export function formatTvciNumber(symbol: string, currentNumber?: string | number): string {
  const cleanSymbol = String(symbol ?? "").trim().replace(/^\/+/, "");
  const numStr = String(currentNumber ?? "").trim();

  if (!numStr || numStr === "[KÝ HIỆU]") {
    return `Số:         /${cleanSymbol}`;
  }

  return `Số: ${numStr}/${cleanSymbol}`;
}

/**
 * VII. PHẦN KÍNH GỬI
 * - Cỡ chữ 13pt, đứng, không đậm, có dấu hai chấm sau Kính gửi.
 * - 1 nơi nhận:
 *   "Kính gửi: Tên đơn vị" (cùng 1 dòng, căn giữa, không có dấu cuối dòng)
 * - 2+ nơi nhận:
 *   "Kính gửi:" (dòng riêng)
 *   "- Đơn vị 1;"
 *   "- Đơn vị 2."
 *   (Dấu "-" thẳng hàng, trước dòng cuối kết thúc bằng ";", dòng cuối kết thúc bằng ".")
 */
export function formatTvciAddressee(rawAddressee: string | string[]): {
  isMultiple: boolean;
  headerLine: string;
  recipientLines: string[];
  fullFormattedText: string;
} {
  let items: string[] = [];

  if (Array.isArray(rawAddressee)) {
    items = rawAddressee;
  } else {
    const text = String(rawAddressee ?? "").trim();
    // Remove leading "Kính gửi:" if user typed it
    const cleanText = text.replace(/^Kính gửi\s*:?[\s]*/i, "").trim();
    items = cleanText.split(/\r?\n/).map((s) => s.trim()).filter(Boolean);
  }

  // Clean each item of existing hyphens, trailing punctuation (; , .)
  const cleanItems = items.map((item) => {
    return item
      .replace(/^[-–—\*\•]\s*/, "") // remove leading dash or bullets
      .replace(/[;,.]+$/, "")       // remove trailing punctuation
      .trim();
  }).filter(Boolean);

  if (cleanItems.length === 0) {
    return {
      isMultiple: false,
      headerLine: "Kính gửi: ……………………………………",
      recipientLines: [],
      fullFormattedText: "Kính gửi: ……………………………………",
    };
  }

  if (cleanItems.length === 1) {
    const single = `Kính gửi: ${cleanItems[0]}`;
    return {
      isMultiple: false,
      headerLine: single,
      recipientLines: [],
      fullFormattedText: single,
    };
  }

  // Multiple recipients (2+)
  const recipientLines = cleanItems.map((item, idx) => {
    const isLast = idx === cleanItems.length - 1;
    const endPunct = isLast ? "." : ";";
    return `- ${item}${endPunct}`;
  });

  const fullFormattedText = `Kính gửi:\n${recipientLines.join("\n")}`;

  return {
    isMultiple: true,
    headerLine: "Kính gửi:",
    recipientLines,
    fullFormattedText,
  };
}

/**
 * VIII. QUY TẮC SAU DẤU CHẤM PHẨY (;)
 * - Trong cùng một đoạn, chữ cái đầu tiên sau dấu ";" phải viết hoa.
 * Ví dụ: "Đơn vị đã tiếp nhận hồ sơ; Sau đó tiến hành kiểm tra; Cuối cùng lập báo cáo."
 */
export function formatSemicolonCapitalization(text: string): string {
  if (!text) return "";
  // Match a semicolon followed by whitespace and a lowercase letter
  return text.replace(/;\s+([a-zà-ỹ])/g, (_, letter: string) => `; ${letter.toUpperCase()}`);
}

/**
 * IX. CÁC ĐOẠN GẠCH ĐẦU DÒNG TRONG NỘI DUNG
 * - Mỗi ý bắt đầu bằng "-"
 * - Chữ cái đầu mỗi ý viết hoa
 * - Các ý trước kết thúc bằng ";"
 * - Ý cuối cùng kết thúc bằng "."
 */
export function formatBulletItems(items: string[]): string[] {
  const cleaned = items.map((item) => item.replace(/^[-–—\*\•]\s*/, "").replace(/[;,.]+$/, "").trim()).filter(Boolean);
  return cleaned.map((item, idx) => {
    const isLast = idx === cleaned.length - 1;
    const capitalized = item.charAt(0).toUpperCase() + item.slice(1);
    const endPunct = isLast ? "." : ";";
    return `- ${capitalized}${endPunct}`;
  });
}

/**
 * X. CÂU KẾT NỘI DUNG
 * - "Trân trọng" hoặc "Trân trọng cảm ơn" chưa có dấu -> thêm "./."
 * - Nếu có dấu "!" -> giữ nguyên dấu "!"
 * - Không thêm dấu câu trùng lặp: "Trân trọng cảm ơn..../."
 */
export function formatTvciClosing(rawClosing: string): string {
  const trimmed = String(rawClosing ?? "").trim();
  if (!trimmed) return "";

  if (/^trân trọng cảm ơn!$/i.test(trimmed) || /^trân trọng!$/i.test(trimmed)) {
    return trimmed;
  }

  // Remove any messy trailing punctuation
  const clean = trimmed.replace(/[.,;:\s\/\\]+$/, "");

  if (/^trân trọng cảm ơn$/i.test(clean)) {
    return "Trân trọng cảm ơn./.";
  }

  if (/^trân trọng$/i.test(clean)) {
    return "Trân trọng./.";
  }

  return trimmed;
}
