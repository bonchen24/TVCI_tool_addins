import type { DocumentSettings } from "../models/document-settings";
import { getRuleProfile, resolveRuleProfileForOrganization } from "../rules/profiles";
import { buildHorizontalRuleOoxml } from "../rules/horizontal-rules";
import { buildRecipientsOoxml } from "../drafting/presets";

export type SkeletonDocumentType =
  | "cong_van"
  | "quyet_dinh"
  | "thong_bao"
  | "to_trinh"
  | "bao_cao"
  | "bien_ban"
  | "ke_hoach"
  | "giay_moi"
  | "phieu";

/**
 * Normalizes user document type label into a standard skeleton kind.
 */
export function resolveSkeletonType(typeStr: string): SkeletonDocumentType {
  const normalized = typeStr.toLowerCase().trim();
  if (normalized.includes("quyết định") || normalized.includes("quyet dinh")) return "quyet_dinh";
  if (normalized.includes("thông báo") || normalized.includes("thong bao")) return "thong_bao";
  if (normalized.includes("tờ trình") || normalized.includes("to trinh")) return "to_trinh";
  if (normalized.includes("báo cáo") || normalized.includes("bao cao")) return "bao_cao";
  if (normalized.includes("biên bản") || normalized.includes("bien ban")) return "bien_ban";
  if (normalized.includes("kế hoạch") || normalized.includes("ke hoach")) return "ke_hoach";
  if (normalized.includes("giấy mời") || normalized.includes("thư mời") || normalized.includes("giay moi")) return "giay_moi";
  if (normalized.includes("phiếu") || normalized.includes("phieu")) return "phieu";
  return "cong_van";
}

/**
 * Builds standard Word OpenXML for document header: 2 columns table
 * Left: Agency & Symbol / Right: National Motto & Date
 */
export function buildHeaderTableOoxml(settings: DocumentSettings): string {
  const agencyUpper = (settings.agency.parentAgency || "VIỆN CƠ KHÍ NĂNG LƯỢNG VÀ MỎ - VINACOMIN").toUpperCase();
  const subAgencyUpper = (settings.agency.issuingAgency || "TRUNG TÂM THỬ NGHIỆM - KIỂM ĐỊNH CÔNG NGHIỆP").toUpperCase();
  const docNumber = settings.symbol.number ? settings.symbol.number : "……";
  const prefix = settings.symbol.prefix || "TVCI";
  const fullSymbol = `Số: ${docNumber}/${prefix}`;
  const location = settings.symbol.location || "Hà Nội";
  const dateStr = settings.symbol.date ? settings.symbol.date : "ngày … tháng … năm …";
  const fullDate = `${location}, ${dateStr}`;

  return `<w:tbl xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:tblPr>
    <w:tblW w:w="9000" w:type="dxa"/>
    <w:jc w:val="center"/>
    <w:tblBorders>
      <w:top w:val="none"/>
      <w:left w:val="none"/>
      <w:bottom w:val="none"/>
      <w:right w:val="none"/>
      <w:insideH w:val="none"/>
      <w:insideV w:val="none"/>
    </w:tblBorders>
  </w:tblPr>
  <w:tblGrid>
    <w:gridCol w:w="4200"/>
    <w:gridCol w:w="4800"/>
  </w:tblGrid>
  <w:tr>
    <w:tc>
      <w:tcPr><w:tcW w:w="4200" w:type="dxa"/></w:tcPr>
      <w:p>
        <w:pPr><w:jc w:val="center"/><w:spacing w:before="0" w:after="0" w:line="240" w:lineRule="auto"/></w:pPr>
        <w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:sz w:val="24"/><w:szCs w:val="24"/></w:rPr><w:t>${agencyUpper}</w:t></w:r>
      </w:p>
      <w:p>
        <w:pPr><w:jc w:val="center"/><w:spacing w:before="0" w:after="0" w:line="240" w:lineRule="auto"/></w:pPr>
        <w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:b/><w:sz w:val="24"/><w:szCs w:val="24"/></w:rPr><w:t>${subAgencyUpper}</w:t></w:r>
      </w:p>
      <w:p>
        <w:pPr><w:jc w:val="center"/><w:spacing w:before="120" w:after="0" w:line="240" w:lineRule="auto"/></w:pPr>
        <w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:sz w:val="24"/><w:szCs w:val="24"/></w:rPr><w:t>${fullSymbol}</w:t></w:r>
      </w:p>
    </w:tc>
    <w:tc>
      <w:tcPr><w:tcW w:w="4800" w:type="dxa"/></w:tcPr>
      <w:p>
        <w:pPr><w:jc w:val="center"/><w:spacing w:before="0" w:after="0" w:line="240" w:lineRule="auto"/></w:pPr>
        <w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:b/><w:sz w:val="24"/><w:szCs w:val="24"/></w:rPr><w:t>CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</w:t></w:r>
      </w:p>
      <w:p>
        <w:pPr><w:jc w:val="center"/><w:spacing w:before="0" w:after="0" w:line="240" w:lineRule="auto"/></w:pPr>
        <w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:b/><w:sz w:val="26"/><w:szCs w:val="26"/></w:rPr><w:t>Độc lập - Tự do - Hạnh phúc</w:t></w:r>
      </w:p>
      <w:p>
        <w:pPr><w:jc w:val="center"/><w:spacing w:before="0" w:after="0" w:line="240" w:lineRule="auto"/></w:pPr>
        <w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:sz w:val="24"/><w:szCs w:val="24"/></w:rPr><w:t>-----------------</w:t></w:r>
      </w:p>
      <w:p>
        <w:pPr><w:jc w:val="center"/><w:spacing w:before="120" w:after="0" w:line="240" w:lineRule="auto"/></w:pPr>
        <w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:i/><w:sz w:val="26"/><w:szCs w:val="26"/></w:rPr><w:t>${fullDate}</w:t></w:r>
      </w:p>
    </w:tc>
  </w:tr>
</w:tbl>`;
}

/**
 * Builds standard signature block OOXML (Right aligned for Signer, Left for Recipients)
 */
export function buildFooterBlockOoxml(settings: DocumentSettings): string {
  const signerRole = (settings.signer.title || "GIÁM ĐỐC").toUpperCase();
  const signerName = settings.signer.fullName || "Họ và tên";
  const recipients = settings.recipients && settings.recipients.length > 0
    ? settings.recipients
    : ["Như trên;", "Lưu: VT, Trung tâm."];

  const recipientLines = recipients
    .map(r => `<w:p><w:pPr><w:spacing w:before="0" w:after="0" w:line="240" w:lineRule="auto"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:sz w:val="22"/><w:szCs w:val="22"/></w:rPr><w:t>- ${r}</w:t></w:r></w:p>`)
    .join("");

  return `<w:tbl xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:tblPr>
    <w:tblW w:w="9000" w:type="dxa"/>
    <w:jc w:val="center"/>
    <w:tblBorders>
      <w:top w:val="none"/>
      <w:left w:val="none"/>
      <w:bottom w:val="none"/>
      <w:right w:val="none"/>
      <w:insideH w:val="none"/>
      <w:insideV w:val="none"/>
    </w:tblBorders>
  </w:tblPr>
  <w:tblGrid>
    <w:gridCol w:w="4500"/>
    <w:gridCol w:w="4500"/>
  </w:tblGrid>
  <w:tr>
    <w:tc>
      <w:tcPr><w:tcW w:w="4500" w:type="dxa"/></w:tcPr>
      <w:p>
        <w:pPr><w:spacing w:before="0" w:after="0" w:line="240" w:lineRule="auto"/></w:pPr>
        <w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:b/><w:i/><w:sz w:val="24"/><w:szCs w:val="24"/></w:rPr><w:t>Nơi nhận:</w:t></w:r>
      </w:p>
      ${recipientLines}
    </w:tc>
    <w:tc>
      <w:tcPr><w:tcW w:w="4500" w:type="dxa"/></w:tcPr>
      <w:p>
        <w:pPr><w:jc w:val="center"/><w:spacing w:before="0" w:after="0" w:line="240" w:lineRule="auto"/></w:pPr>
        <w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:b/><w:sz w:val="26"/><w:szCs w:val="26"/></w:rPr><w:t>${signerRole}</w:t></w:r>
      </w:p>
      <w:p><w:pPr><w:jc w:val="center"/><w:spacing w:before="900" w:after="0" w:line="240" w:lineRule="auto"/></w:pPr><w:r><w:t></w:t></w:r></w:p>
      <w:p>
        <w:pPr><w:jc w:val="center"/><w:spacing w:before="0" w:after="0" w:line="240" w:lineRule="auto"/></w:pPr>
        <w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:b/><w:sz w:val="26"/><w:szCs w:val="26"/></w:rPr><w:t>${signerName}</w:t></w:r>
      </w:p>
    </w:tc>
  </w:tr>
</w:tbl>`;
}

/**
 * Creates and formats document skeleton into Word document directly.
 */
export async function createDocumentSkeleton(type: SkeletonDocumentType, settings: DocumentSettings): Promise<void> {
  const headerXml = buildHeaderTableOoxml(settings);
  const footerXml = buildFooterBlockOoxml(settings);

  await Word.run(async (context) => {
    const body = context.document.body;

    // Apply standard A4 page layout
    const sections = context.document.sections;
    sections.load("items");
    await context.sync();
    const section = sections.items[0];
    if (section) {
      section.pageSetup.topMargin = 56.7; // 20 mm (72 pt / 25.4 * 20)
      section.pageSetup.bottomMargin = 56.7; // 20 mm
      section.pageSetup.leftMargin = 85.05; // 30 mm
      section.pageSetup.rightMargin = 42.5; // 15 mm
    }

    // Insert Header Table
    body.insertOoxml(headerXml, Word.InsertLocation.end);

    // Insert Document-specific Body Structure
    if (type === "cong_van") {
      const subject = settings.docTitle || "V/v thực hiện nhiệm vụ kế hoạch";
      const pSubject = body.insertParagraph(`V/v: ${subject}`, Word.InsertLocation.end);
      pSubject.font.name = "Times New Roman";
      pSubject.font.size = 12;
      pSubject.font.italic = true;
      pSubject.alignment = Word.Alignment.left;
      pSubject.spaceBefore = 6;
      pSubject.spaceAfter = 12;

      const pTo = body.insertParagraph("Kính gửi: Các phòng, đơn vị trực thuộc.", Word.InsertLocation.end);
      pTo.font.name = "Times New Roman";
      pTo.font.size = 13;
      pTo.font.bold = true;
      pTo.alignment = Word.Alignment.left;
      pTo.spaceBefore = 6;
      pTo.spaceAfter = 12;

      const pContent = body.insertParagraph(
        "Thực hiện kế hoạch công tác và nhiệm vụ được giao, Trung tâm Thử nghiệm - Kiểm định Công nghiệp yêu cầu các đơn vị triển khai các nội dung sau:",
        Word.InsertLocation.end,
      );
      pContent.font.name = "Times New Roman";
      pContent.font.size = 13;
      pContent.alignment = Word.Alignment.justified;
      pContent.firstLineIndent = 28.35; // 10 mm
      pContent.spaceBefore = 3;
      pContent.spaceAfter = 3;
      pContent.lineSpacing = 16;
    } else if (type === "quyet_dinh") {
      const pTitle = body.insertParagraph("QUYẾT ĐỊNH", Word.InsertLocation.end);
      pTitle.font.name = "Times New Roman";
      pTitle.font.size = 14;
      pTitle.font.bold = true;
      pTitle.alignment = Word.Alignment.centered;
      pTitle.spaceBefore = 12;
      pTitle.spaceAfter = 4;

      const pAbstract = body.insertParagraph(`Về việc ${settings.docTitle || "ban hành quy chế quản lý nội bộ"}`, Word.InsertLocation.end);
      pAbstract.font.name = "Times New Roman";
      pAbstract.font.size = 13;
      pAbstract.font.bold = true;
      pAbstract.alignment = Word.Alignment.centered;
      pAbstract.spaceBefore = 2;
      pAbstract.spaceAfter = 12;

      const pBasis = body.insertParagraph(
        "Căn cứ Quyết định thành lập và quy định chức năng, nhiệm vụ của Trung tâm Thử nghiệm - Kiểm định Công nghiệp;\nTheo đề nghị của Trưởng phòng Tổ chức - Hành chính,",
        Word.InsertLocation.end,
      );
      pBasis.font.name = "Times New Roman";
      pBasis.font.size = 13;
      pBasis.font.italic = true;
      pBasis.alignment = Word.Alignment.justified;
      pBasis.firstLineIndent = 28.35;
      pBasis.spaceBefore = 3;
      pBasis.spaceAfter = 6;

      const pDecide = body.insertParagraph("QUYẾT ĐỊNH:", Word.InsertLocation.end);
      pDecide.font.name = "Times New Roman";
      pDecide.font.size = 13;
      pDecide.font.bold = true;
      pDecide.alignment = Word.Alignment.centered;
      pDecide.spaceBefore = 6;
      pDecide.spaceAfter = 6;

      const pArticle1 = body.insertParagraph(
        "Điều 1. Ban hành kèm theo Quyết định này quy chế hoạt động chuyên môn của Trung tâm.",
        Word.InsertLocation.end,
      );
      pArticle1.font.name = "Times New Roman";
      pArticle1.font.size = 13;
      pArticle1.alignment = Word.Alignment.justified;
      pArticle1.firstLineIndent = 28.35;
      pArticle1.spaceBefore = 3;
      pArticle1.spaceAfter = 3;
    } else {
      const typeLabel =
        type === "thong_bao"
          ? "THÔNG BÁO"
          : type === "to_trinh"
          ? "TỜ TRÌNH"
          : type === "bao_cao"
          ? "BÁO CÁO"
          : type === "ke_hoach"
          ? "KẾ HOẠCH"
          : type === "giay_moi"
          ? "GIẤY MỜI"
          : type === "phieu"
          ? "PHIẾU ĐỀ NGHỊ / THỬ NGHIỆM"
          : "BIÊN BẢN";
      const pTitle = body.insertParagraph(typeLabel, Word.InsertLocation.end);
      pTitle.font.name = "Times New Roman";
      pTitle.font.size = 14;
      pTitle.font.bold = true;
      pTitle.alignment = Word.Alignment.centered;
      pTitle.spaceBefore = 12;
      pTitle.spaceAfter = 4;

      const pSubject = body.insertParagraph(settings.docTitle || `Về nội dung công tác quý / năm`, Word.InsertLocation.end);
      pSubject.font.name = "Times New Roman";
      pSubject.font.size = 13;
      pSubject.font.bold = true;
      pSubject.alignment = Word.Alignment.centered;
      pSubject.spaceBefore = 2;
      pSubject.spaceAfter = 12;

      const pContent = body.insertParagraph(
        "Nội dung chi tiết của văn bản được tổng hợp và triển khai theo chương trình kế hoạch đã phê duyệt:",
        Word.InsertLocation.end,
      );
      pContent.font.name = "Times New Roman";
      pContent.font.size = 13;
      pContent.alignment = Word.Alignment.justified;
      pContent.firstLineIndent = 28.35;
      pContent.spaceBefore = 3;
      pContent.spaceAfter = 3;
    }

    // Insert Footer Block (Nơi nhận & Chữ ký)
    body.insertOoxml(footerXml, Word.InsertLocation.end);

    await context.sync();
  });
}
