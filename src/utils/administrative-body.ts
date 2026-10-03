const formalHeaderPatterns = [
  /^CỘNG\s+HÒA\s+XÃ\s+HỘI\s+CHỦ\s+NGHĨA\s+VIỆT\s+NAM$/iu,
  /^Độc\s+lập\s*[-–—]\s*Tự\s+do\s*[-–—]\s*Hạnh\s+phúc[.!]?$/iu,
];

const structuralLinePatterns = [
  ...formalHeaderPatterns,
  /^(?:Kính\s+gửi|Nơi\s+nhận)\s*:?/iu,
  /^(?:Số\s*:|(?:[\p{L} .'-]+),\s*ngày\s+\d)/iu,
  /^(?:V\/v|Về việc)\s*:?/iu,
  /^(?:CÔNG VĂN|THÔNG BÁO|QUYẾT ĐỊNH|TỜ TRÌNH|BÁO CÁO|BIÊN BẢN|THƯ MỜI)$/iu,
  /^(?:GIÁM ĐỐC|VIỆN TRƯỞNG|PHÓ GIÁM ĐỐC|PHÓ VIỆN TRƯỞNG)$/iu,
  /^(?:KT\.|TL\.|TUQ\.)\s*(?:GIÁM ĐỐC|VIỆN TRƯỞNG|PHÓ GIÁM ĐỐC|PHÓ VIỆN TRƯỞNG)?$/iu,
  /^\((?:Chữ ký|Ký)[^)]*\)$/iu,
  /^\[(?:Họ và tên|Chức danh|Chữ ký)[^\]]*\]$/iu,
];

const headerSectionStart = /^(?:Kính\s+gửi|Nơi\s+nhận)\s*:?/iu;
const startsBusinessBody = /^(?:Đề nghị|Yêu cầu|Căn cứ|Thực hiện|Để|Nhằm|Các đơn vị|Trung tâm|Quý đơn vị|Quý công ty|Kính đề nghị|Báo cáo|Chúng tôi|Theo)/iu;

/** Removes only standalone template structure and keeps source prose and paragraph breaks. */
export function sanitizeAdministrativeBody(value: string): string {
  const lines = value.replace(/\r\n?/g, "\n").split("\n");
  const firstHeader = lines.findIndex((line) => formalHeaderPatterns.some((pattern) => pattern.test(line.trim())));
  const headerEnd = firstHeader < 0
    ? -1
    : lines.findIndex((line, index) => index > firstHeader && headerSectionStart.test(line.trim()));
  const kept: string[] = [];
  let skippingAddressee = headerEnd >= 0;

  lines.forEach((line, index) => {
    const trimmed = line.trim();
    if (headerEnd >= 0 && index <= headerEnd) return;
    if (skippingAddressee) {
      if (!trimmed) {
        skippingAddressee = false;
        kept.push(line);
        return;
      }
      if (!startsBusinessBody.test(trimmed)) return;
      skippingAddressee = false;
    }
    if (structuralLinePatterns.some((pattern) => pattern.test(trimmed))) return;
    kept.push(line);
  });

  return kept.join("\n").trim();
}