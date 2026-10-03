/**
 * Document AST Fixtures for Vietnamese Administrative Documents
 */

export interface TiptapNode {
  type: string;
  attrs?: Record<string, any>;
  content?: TiptapNode[];
  text?: string;
  marks?: Array<{ type: string; attrs?: Record<string, any> }>;
}

export interface TiptapDocument {
  type: "doc";
  attrs?: {
    pageSize?: "A4";
    orientation?: "portrait" | "landscape";
    margins?: { topMm: number; bottomMm: number; leftMm: number; rightMm: number };
  };
  content: TiptapNode[];
}

/** Standard A4 Page Setup per Nghị định 30/2020/NĐ-CP */
export const STANDARD_A4_PAGE_SETUP = {
  pageSize: "A4" as const,
  orientation: "portrait" as const,
  margins: {
    topMm: 20,
    bottomMm: 20,
    leftMm: 30,
    rightMm: 15,
  },
};

/** Standard 2-column header table model (Agency left, Motto right) */
export function createHeaderTableNode(agencyName: string, motto: string, dateStr: string): TiptapNode {
  return {
    type: "table",
    attrs: { borderless: true, columnRatios: [0.45, 0.55] },
    content: [
      {
        type: "tableRow",
        content: [
          {
            type: "tableCell",
            attrs: { align: "center" },
            content: [
              {
                type: "paragraph",
                attrs: { align: "center", fontSize: 13, bold: true, fontName: "Times New Roman" },
                text: agencyName,
              },
              {
                type: "paragraph",
                attrs: { align: "center", fontSize: 13, fontName: "Times New Roman" },
                text: "Số: 102/TVCI-VP",
              },
            ],
          },
          {
            type: "tableCell",
            attrs: { align: "center" },
            content: [
              {
                type: "paragraph",
                attrs: { align: "center", fontSize: 13, bold: true, fontName: "Times New Roman" },
                text: motto,
              },
              {
                type: "paragraph",
                attrs: { align: "center", fontSize: 14, fontName: "Times New Roman" },
                text: "Độc lập - Tự do - Hạnh phúc",
              },
              {
                type: "paragraph",
                attrs: { align: "right", fontSize: 13, italic: true, fontName: "Times New Roman" },
                text: dateStr,
              },
            ],
          },
        ],
      },
    ],
  };
}

/** Standard 2-column footer table model (Recipients left, Signer right) */
export function createFooterTableNode(recipients: string[], signerRole: string, signerName: string): TiptapNode {
  return {
    type: "table",
    attrs: { borderless: true, columnRatios: [0.5, 0.5] },
    content: [
      {
        type: "tableRow",
        content: [
          {
            type: "tableCell",
            attrs: { align: "left" },
            content: [
              {
                type: "paragraph",
                attrs: { fontSize: 12, bold: true, italic: true, fontName: "Times New Roman" },
                text: "Nơi nhận:",
              },
              ...recipients.map((rec) => ({
                type: "paragraph",
                attrs: { fontSize: 11, fontName: "Times New Roman", spaceBefore: 0, spaceAfter: 0 },
                text: `- ${rec};`,
              })),
            ],
          },
          {
            type: "tableCell",
            attrs: { align: "center" },
            content: [
              {
                type: "paragraph",
                attrs: { fontSize: 13, bold: true, align: "center", fontName: "Times New Roman" },
                text: signerRole,
              },
              {
                type: "paragraph",
                attrs: { minHeight: 40, fontName: "Times New Roman" },
                text: "", // Space for signature
              },
              {
                type: "paragraph",
                attrs: { fontSize: 13, bold: true, align: "center", fontName: "Times New Roman" },
                text: signerName,
              },
            ],
          },
        ],
      },
    ],
  };
}

/** Complete sample Official Dispatch (Công văn) document AST */
export const SAMPLE_CONG_VAN_DOC: TiptapDocument = {
  type: "doc",
  attrs: STANDARD_A4_PAGE_SETUP,
  content: [
    createHeaderTableNode(
      "TỔNG CÔNG TY CÔNG NGHIỆP MỎ VIỆT BẮC TKV-CTCP",
      "CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM",
      "Hà Nội, ngày 29 tháng 9 năm 2026"
    ),
    {
      type: "paragraph",
      attrs: { align: "center", fontSize: 14, bold: true, spaceBefore: 6, spaceAfter: 6, fontName: "Times New Roman" },
      text: "V/v báo cáo tiến độ chuẩn hóa văn bản hành chính điện tử",
    },
    {
      type: "paragraph",
      attrs: { align: "left", fontSize: 13, bold: true, fontName: "Times New Roman" },
      text: "Kính gửi: Tập đoàn Công nghiệp Than - Khoáng sản Việt Nam",
    },
    {
      type: "paragraph",
      attrs: {
        align: "justify",
        fontSize: 13,
        lineSpacing: 1.2,
        spaceBefore: 2,
        spaceAfter: 2,
        firstLineIndentMm: 10,
        fontName: "Times New Roman",
      },
      text: "Thực hiện Nghị định số 30/2020/NĐ-CP của Chính phủ về công tác văn thư, Tổng công ty Công nghiệp mỏ Việt Bắc TKV-CTCP trân trọng báo cáo tình hình triển khai hệ thống biên soạn và chuẩn hóa văn bản hành chính điện tử quý III năm 2026.",
    },
    createFooterTableNode(
      ["Như trên", "Lưu: VT, CNTT"],
      "TỔNG GIÁM ĐỐC",
      "Nguyễn Văn An"
    ),
  ],
};
