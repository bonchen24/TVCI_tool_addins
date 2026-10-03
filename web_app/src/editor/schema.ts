import type { JSONContent } from '@tiptap/core';

export const defaultDocumentState: JSONContent = {
  type: 'doc',
  content: [
    {
      type: 'table',
      attrs: {
        tableType: 'admin-header',
        isBorderless: true,
        columnRatio: '40-60',
      },
      content: [
        {
          type: 'tableRow',
          content: [
            {
              type: 'tableCell',
              attrs: {
                colspan: 1,
                rowspan: 1,
                colwidth: [250],
                cellType: 'header-left',
                verticalAlign: 'top',
              },
              content: [
                {
                  type: 'paragraph',
                  attrs: {
                    textAlign: 'center',
                    fontFamily: 'Times New Roman',
                    fontSize: 12,
                    lineSpacing: 1.15,
                    spaceBefore: 0,
                    spaceAfter: 0,
                    firstLineIndentMm: 0,
                  },
                  content: [
                    {
                      type: 'text',
                      text: 'TẬP ĐOÀN CÔNG NGHIỆP THAN - KHOÁNG SẢN VIỆT NAM',
                    },
                  ],
                },
                {
                  type: 'paragraph',
                  attrs: {
                    textAlign: 'center',
                    fontFamily: 'Times New Roman',
                    fontSize: 12,
                    lineSpacing: 1.15,
                    spaceBefore: 2,
                    spaceAfter: 0,
                    firstLineIndentMm: 0,
                  },
                  content: [
                    {
                      type: 'text',
                      marks: [{ type: 'bold' }],
                      text: 'VIỆN CƠ KHÍ NĂNG LƯỢNG VÀ MỎ - VINACOMIN',
                    },
                  ],
                },
                {
                  type: 'adminRule',
                  attrs: {
                    kind: 'AGENCY',
                    widthPercent: 40,
                  },
                },
                {
                  type: 'paragraph',
                  attrs: {
                    textAlign: 'center',
                    fontFamily: 'Times New Roman',
                    fontSize: 13,
                    lineSpacing: 1.2,
                    spaceBefore: 4,
                    spaceAfter: 0,
                    firstLineIndentMm: 0,
                  },
                  content: [
                    {
                      type: 'text',
                      text: 'Số: 125/VCNM-TTTN',
                    },
                  ],
                },
                {
                  type: 'paragraph',
                  attrs: {
                    textAlign: 'center',
                    fontFamily: 'Times New Roman',
                    fontSize: 12,
                    lineSpacing: 1.2,
                    spaceBefore: 2,
                    spaceAfter: 0,
                    firstLineIndentMm: 0,
                  },
                  content: [
                    {
                      type: 'text',
                      marks: [{ type: 'italic' }],
                      text: 'V/v kiểm định kỹ thuật an toàn hệ thống thiết bị mỏ hầm lò',
                    },
                  ],
                },
              ],
            },
            {
              type: 'tableCell',
              attrs: {
                colspan: 1,
                rowspan: 1,
                colwidth: [374],
                cellType: 'header-right',
                verticalAlign: 'top',
              },
              content: [
                {
                  type: 'paragraph',
                  attrs: {
                    textAlign: 'center',
                    fontFamily: 'Times New Roman',
                    fontSize: 12,
                    lineSpacing: 1.15,
                    spaceBefore: 0,
                    spaceAfter: 0,
                    firstLineIndentMm: 0,
                  },
                  content: [
                    {
                      type: 'text',
                      marks: [{ type: 'bold' }],
                      text: 'CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM',
                    },
                  ],
                },
                {
                  type: 'paragraph',
                  attrs: {
                    textAlign: 'center',
                    fontFamily: 'Times New Roman',
                    fontSize: 13,
                    lineSpacing: 1.15,
                    spaceBefore: 2,
                    spaceAfter: 0,
                    firstLineIndentMm: 0,
                  },
                  content: [
                    {
                      type: 'text',
                      marks: [{ type: 'bold' }],
                      text: 'Độc lập - Tự do - Hạnh phúc',
                    },
                  ],
                },
                {
                  type: 'adminRule',
                  attrs: {
                    kind: 'MOTTO',
                    widthPercent: 95,
                  },
                },
                {
                  type: 'paragraph',
                  attrs: {
                    textAlign: 'center',
                    fontFamily: 'Times New Roman',
                    fontSize: 13,
                    lineSpacing: 1.2,
                    spaceBefore: 4,
                    spaceAfter: 0,
                    firstLineIndentMm: 0,
                  },
                  content: [
                    {
                      type: 'text',
                      marks: [{ type: 'italic' }],
                      text: 'Hà Nội, ngày 09 tháng 9 năm 2026',
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    },
    {
      type: 'paragraph',
      attrs: {
        textAlign: 'left',
        fontFamily: 'Times New Roman',
        fontSize: 13,
        lineSpacing: 1.3,
        spaceBefore: 14,
        spaceAfter: 6,
        firstLineIndentMm: 0,
      },
      content: [
        {
          type: 'text',
          marks: [{ type: 'bold' }],
          text: 'Kính gửi: ',
        },
        {
          type: 'text',
          text: 'Các đơn vị thành viên Tập đoàn Công nghiệp Than - Khoáng sản Việt Nam.',
        },
      ],
    },
    {
      type: 'paragraph',
      attrs: {
        textAlign: 'justify',
        fontFamily: 'Times New Roman',
        fontSize: 13,
        lineSpacing: 1.2,
        spaceBefore: 2,
        spaceAfter: 2,
        firstLineIndentMm: 12.7,
      },
      content: [
        {
          type: 'text',
          marks: [{ type: 'italic' }],
          text: 'Căn cứ Nghị định số 30/2020/NĐ-CP ngày 05 tháng 3 năm 2020 của Chính phủ về công tác văn thư;',
        },
      ],
    },
    {
      type: 'paragraph',
      attrs: {
        textAlign: 'justify',
        fontFamily: 'Times New Roman',
        fontSize: 13,
        lineSpacing: 1.2,
        spaceBefore: 2,
        spaceAfter: 2,
        firstLineIndentMm: 12.7,
      },
      content: [
        {
          type: 'text',
          marks: [{ type: 'italic' }],
          text: 'Căn cứ chức năng, nhiệm vụ của Viện Cơ khí Năng lượng và Mỏ - VINACOMIN trong công tác kiểm định kỹ thuật an toàn lao động và thử nghiệm công nghiệp;',
        },
      ],
    },
    {
      type: 'paragraph',
      attrs: {
        textAlign: 'justify',
        fontFamily: 'Times New Roman',
        fontSize: 13,
        lineSpacing: 1.2,
        spaceBefore: 2,
        spaceAfter: 2,
        firstLineIndentMm: 12.7,
      },
      content: [
        {
          type: 'text',
          text: 'Nhằm đảm bảo an toàn tuyệt đối cho người lao động và thiết bị trong quá trình sản xuất than hầm lò, Trung tâm Thử nghiệm - Kiểm định Công nghiệp (TVCI) đề nghị Thủ trưởng các đơn vị phối hợp triển khai rà soát định kỳ toàn bộ hệ thống tời trục, quạt gió chính và thiết bị điện phòng nổ trước mùa mưa bão năm 2026.',
        },
      ],
    },
    {
      type: 'paragraph',
      attrs: {
        textAlign: 'justify',
        fontFamily: 'Times New Roman',
        fontSize: 13,
        lineSpacing: 1.2,
        spaceBefore: 2,
        spaceAfter: 6,
        firstLineIndentMm: 12.7,
      },
      content: [
        {
          type: 'text',
          text: 'Kính đề nghị các đơn vị lập kế hoạch chi tiết và gửi văn bản đăng ký kiểm định về Viện trước ngày 25 tháng 9 năm 2026 để tổng hợp và bố trí lịch công tác./.',
        },
      ],
    },
    {
      type: 'table',
      attrs: {
        tableType: 'admin-footer',
        isBorderless: true,
        columnRatio: '50-50',
      },
      content: [
        {
          type: 'tableRow',
          content: [
            {
              type: 'tableCell',
              attrs: {
                colspan: 1,
                rowspan: 1,
                colwidth: [312],
                cellType: 'footer-recipients',
                verticalAlign: 'top',
              },
              content: [
                {
                  type: 'paragraph',
                  attrs: {
                    textAlign: 'left',
                    fontFamily: 'Times New Roman',
                    fontSize: 12,
                    lineSpacing: 1.15,
                    spaceBefore: 0,
                    spaceAfter: 2,
                    firstLineIndentMm: 0,
                  },
                  content: [
                    {
                      type: 'text',
                      marks: [{ type: 'bold' }, { type: 'italic' }],
                      text: 'Nơi nhận:',
                    },
                  ],
                },
                {
                  type: 'paragraph',
                  attrs: {
                    textAlign: 'left',
                    fontFamily: 'Times New Roman',
                    fontSize: 11,
                    lineSpacing: 1.15,
                    spaceBefore: 1,
                    spaceAfter: 1,
                    firstLineIndentMm: 0,
                  },
                  content: [
                    {
                      type: 'text',
                      text: '- Như trên;',
                    },
                  ],
                },
                {
                  type: 'paragraph',
                  attrs: {
                    textAlign: 'left',
                    fontFamily: 'Times New Roman',
                    fontSize: 11,
                    lineSpacing: 1.15,
                    spaceBefore: 1,
                    spaceAfter: 1,
                    firstLineIndentMm: 0,
                  },
                  content: [
                    {
                      type: 'text',
                      text: '- Tổng Giám đốc Tập đoàn (để b/c);',
                    },
                  ],
                },
                {
                  type: 'paragraph',
                  attrs: {
                    textAlign: 'left',
                    fontFamily: 'Times New Roman',
                    fontSize: 11,
                    lineSpacing: 1.15,
                    spaceBefore: 1,
                    spaceAfter: 1,
                    firstLineIndentMm: 0,
                  },
                  content: [
                    {
                      type: 'text',
                      text: '- Ban An toàn - TKV;',
                    },
                  ],
                },
                {
                  type: 'paragraph',
                  attrs: {
                    textAlign: 'left',
                    fontFamily: 'Times New Roman',
                    fontSize: 11,
                    lineSpacing: 1.15,
                    spaceBefore: 1,
                    spaceAfter: 1,
                    firstLineIndentMm: 0,
                  },
                  content: [
                    {
                      type: 'text',
                      text: '- Lưu: VT, TTTN.',
                    },
                  ],
                },
              ],
            },
            {
              type: 'tableCell',
              attrs: {
                colspan: 1,
                rowspan: 1,
                colwidth: [312],
                cellType: 'footer-signer',
                verticalAlign: 'top',
              },
              content: [
                {
                  type: 'paragraph',
                  attrs: {
                    textAlign: 'center',
                    fontFamily: 'Times New Roman',
                    fontSize: 13,
                    lineSpacing: 1.15,
                    spaceBefore: 0,
                    spaceAfter: 0,
                    firstLineIndentMm: 0,
                  },
                  content: [
                    {
                      type: 'text',
                      marks: [{ type: 'bold' }],
                      text: 'KT. VIỆN TRƯỞNG',
                    },
                  ],
                },
                {
                  type: 'paragraph',
                  attrs: {
                    textAlign: 'center',
                    fontFamily: 'Times New Roman',
                    fontSize: 13,
                    lineSpacing: 1.15,
                    spaceBefore: 2,
                    spaceAfter: 0,
                    firstLineIndentMm: 0,
                  },
                  content: [
                    {
                      type: 'text',
                      marks: [{ type: 'bold' }],
                      text: 'PHÓ VIỆN TRƯỞNG',
                    },
                  ],
                },
                {
                  type: 'paragraph',
                  attrs: {
                    textAlign: 'center',
                    fontFamily: 'Times New Roman',
                    fontSize: 13,
                    lineSpacing: 1.0,
                    spaceBefore: 0,
                    spaceAfter: 0,
                    firstLineIndentMm: 0,
                  },
                  content: [
                    {
                      type: 'text',
                      marks: [{ type: 'italic' }],
                      text: ' ',
                    },
                  ],
                },
                {
                  type: 'paragraph',
                  attrs: {
                    textAlign: 'center',
                    fontFamily: 'Times New Roman',
                    fontSize: 13,
                    lineSpacing: 1.0,
                    spaceBefore: 0,
                    spaceAfter: 0,
                    firstLineIndentMm: 0,
                  },
                  content: [
                    {
                      type: 'text',
                      marks: [{ type: 'italic' }],
                      text: ' ',
                    },
                  ],
                },
                {
                  type: 'paragraph',
                  attrs: {
                    textAlign: 'center',
                    fontFamily: 'Times New Roman',
                    fontSize: 13,
                    lineSpacing: 1.0,
                    spaceBefore: 0,
                    spaceAfter: 0,
                    firstLineIndentMm: 0,
                  },
                  content: [
                    {
                      type: 'text',
                      marks: [{ type: 'italic' }],
                      text: ' ',
                    },
                  ],
                },
                {
                  type: 'paragraph',
                  attrs: {
                    textAlign: 'center',
                    fontFamily: 'Times New Roman',
                    fontSize: 13,
                    lineSpacing: 1.15,
                    spaceBefore: 0,
                    spaceAfter: 0,
                    firstLineIndentMm: 0,
                  },
                  content: [
                    {
                      type: 'text',
                      marks: [{ type: 'bold' }],
                      text: 'TS. Nguyễn Văn A',
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    },
  ],
};
