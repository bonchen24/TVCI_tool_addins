import { describe, it, expect } from 'vitest';
import type { JSONContent } from '@/docx';
import { exportDocx, importDocx } from '@/docx';

describe('DOCX Roundtrip Interoperability (AST -> DOCX -> AST)', () => {
  const sourceAdministrativeDoc: JSONContent = {
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
                content: [
                  {
                    type: 'paragraph',
                    attrs: { textAlign: 'center', fontFamily: 'Times New Roman', fontSize: 12 },
                    content: [{ type: 'text', text: 'TẬP ĐOÀN CÔNG NGHIỆP THAN - KHOÁNG SẢN VIỆT NAM' }],
                  },
                  {
                    type: 'paragraph',
                    attrs: { textAlign: 'center', fontFamily: 'Times New Roman', fontSize: 13 },
                    content: [
                      {
                        type: 'text',
                        text: 'VIỆN CƠ KHÍ NĂNG LƯỢNG VÀ MỎ - VINACOMIN',
                        marks: [{ type: 'bold' }],
                      },
                    ],
                  },
                  {
                    type: 'adminRule',
                    attrs: { kind: 'AGENCY', widthPercent: 40 },
                  },
                  {
                    type: 'paragraph',
                    attrs: { textAlign: 'center', fontFamily: 'Times New Roman', fontSize: 13 },
                    content: [{ type: 'text', text: 'Số: 45/VKH-VP' }],
                  },
                ],
              },
              {
                type: 'tableCell',
                content: [
                  {
                    type: 'paragraph',
                    attrs: { textAlign: 'center', fontFamily: 'Times New Roman', fontSize: 13 },
                    content: [
                      {
                        type: 'text',
                        text: 'CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM',
                        marks: [{ type: 'bold' }],
                      },
                    ],
                  },
                  {
                    type: 'paragraph',
                    attrs: { textAlign: 'center', fontFamily: 'Times New Roman', fontSize: 14 },
                    content: [
                      {
                        type: 'text',
                        text: 'Độc lập - Tự do - Hạnh phúc',
                        marks: [{ type: 'bold' }],
                      },
                    ],
                  },
                  {
                    type: 'adminRule',
                    attrs: { kind: 'MOTTO', widthPercent: 95 },
                  },
                  {
                    type: 'paragraph',
                    attrs: { textAlign: 'right', fontFamily: 'Times New Roman', fontSize: 13 },
                    content: [
                      {
                        type: 'text',
                        text: 'Hà Nội, ngày 29 tháng 09 năm 2026',
                        marks: [{ type: 'italic' }],
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
        type: 'heading',
        attrs: { level: 1, textAlign: 'center' },
        content: [{ type: 'text', text: 'QUYẾT ĐỊNH' }],
      },
      {
        type: 'paragraph',
        attrs: {
          fontFamily: 'Times New Roman',
          fontSize: 13,
          lineSpacing: 1.2,
          spaceBefore: 2,
          spaceAfter: 2,
          firstLineIndentMm: 10,
          textAlign: 'justify',
        },
        content: [
          {
            type: 'text',
            text: 'Căn cứ Nghị định số 30/2020/NĐ-CP ngày 05 tháng 3 năm 2020 của Chính phủ về công tác văn thư;',
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
                content: [
                  {
                    type: 'paragraph',
                    attrs: { textAlign: 'left', fontFamily: 'Times New Roman', fontSize: 12 },
                    content: [
                      {
                        type: 'text',
                        text: 'Nơi nhận: Như trên, Lưu VT.',
                        marks: [{ type: 'bold' }],
                      },
                    ],
                  },
                ],
              },
              {
                type: 'tableCell',
                content: [
                  {
                    type: 'paragraph',
                    attrs: { textAlign: 'center', fontFamily: 'Times New Roman', fontSize: 13 },
                    content: [
                      {
                        type: 'text',
                        text: 'VIỆN TRƯỞNG',
                        marks: [{ type: 'bold' }],
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

  it('preserves text integrity and hierarchy across complete roundtrip cycle', async () => {
    // 1. Export AST to DOCX buffer
    const buffer = (await exportDocx(sourceAdministrativeDoc, { outputType: 'buffer' })) as Buffer;
    expect(buffer).toBeInstanceOf(Buffer);
    expect(buffer.length).toBeGreaterThan(0);

    // 2. Re-import DOCX buffer into AST
    const roundtripAst = await importDocx(buffer);

    expect(roundtripAst.type).toBe('doc');
    expect(Array.isArray(roundtripAst.content)).toBe(true);

    const blocks = roundtripAst.content!;
    expect(blocks.length).toBeGreaterThanOrEqual(4);

    // 3. Verify Header Table Structure
    const headerTable = blocks[0];
    expect(headerTable.type).toBe('table');
    expect(headerTable.attrs?.tableType).toBe('admin-header');
    expect(headerTable.attrs?.isBorderless).toBe(true);

    // Check header cell contents
    const headerRow = headerTable.content![0];
    const leftCell = headerRow.content![0];
    const rightCell = headerRow.content![1];

    const leftText = JSON.stringify(leftCell);
    expect(leftText).toContain('VIỆN CƠ KHÍ NĂNG LƯỢNG VÀ MỎ');
    expect(leftText).toContain('Số: 45/VKH-VP');

    const rightText = JSON.stringify(rightCell);
    expect(rightText).toContain('CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM');
    expect(rightText).toContain('Độc lập - Tự do - Hạnh phúc');

    // 4. Verify Heading & Body Paragraph
    const headingBlock = blocks.find((b: any) => b.type === 'heading');
    expect(headingBlock).toBeDefined();
    expect(JSON.stringify(headingBlock)).toContain('QUYẾT ĐỊNH');

    const bodyParagraph = blocks.find(
      (b: any) => b.type === 'paragraph' && JSON.stringify(b).includes('Nghị định số 30/2020/NĐ-CP')
    );
    expect(bodyParagraph).toBeDefined();
    expect(bodyParagraph?.attrs?.fontSize).toBe(13);
    expect(bodyParagraph?.attrs?.lineSpacing).toBe(1.2);

    // 5. Verify Footer Table Structure
    const footerTable = blocks[blocks.length - 1];
    expect(footerTable.type).toBe('table');
    expect(footerTable.attrs?.tableType).toBe('admin-footer');
    expect(footerTable.attrs?.isBorderless).toBe(true);

    const footerText = JSON.stringify(footerTable);
    expect(footerText).toContain('Nơi nhận');
    expect(footerText).toContain('VIỆN TRƯỞNG');
  });

  it('preserves all Vietnamese Unicode diacritics through the export-import pipeline', async () => {
    const complexVietnameseText =
      'Đại biểu Quốc hội, Chủ tịch Hội đồng thành viên, Tổng Giám đốc; ' +
      'Kính gửi: Các cơ quan, đơn vị, ban ngành thuộc Bộ Năng lượng; ' +
      'Chữ mẫu kiểm tra: àáảãạ, ăằắẳẵặ, âầấẩẫậ, èéẻẽẹ, êềếểễệ, ìíỉĩị, òóỏõọ, ôồốổỗộ, ơờớởỡợ, ùúủũụ, ưừứửữự, ỳýỷỹỵ, đ, Đ.';

    const unicodeDoc: JSONContent = {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          attrs: { textAlign: 'justify', fontSize: 13 },
          content: [{ type: 'text', text: complexVietnameseText }],
        },
      ],
    };

    const buffer = (await exportDocx(unicodeDoc, { outputType: 'buffer' })) as Buffer;
    const reimported = await importDocx(buffer);

    const firstP = reimported.content![0];
    const extractedText = firstP.content?.map((c: any) => c.text || '').join('') || '';

    expect(extractedText).toContain('Đại biểu Quốc hội');
    expect(extractedText).toContain('Kính gửi: Các cơ quan');
    expect(extractedText).toContain('ăằắẳẵặ');
    expect(extractedText).toContain('êềếểễệ');
    expect(extractedText).toContain('ôồốổỗộ');
    expect(extractedText).toContain('ưừứửữự');
  });

  it('supports modify-export-reimport editing cycle seamlessly', async () => {
    const originalDoc: JSONContent = {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          attrs: { textAlign: 'justify', fontSize: 13 },
          content: [{ type: 'text', text: 'Bản thảo ban đầu.' }],
        },
      ],
    };

    // Step 1: Export original
    const buf1 = (await exportDocx(originalDoc, { outputType: 'buffer' })) as Buffer;
    const ast1 = await importDocx(buf1);

    // Step 2: Edit in memory (simulate user typing in editor)
    const modifiedAst: JSONContent = {
      ...ast1,
      content: [
        ...(ast1.content || []),
        {
          type: 'paragraph',
          attrs: { textAlign: 'justify', fontSize: 13 },
          content: [{ type: 'text', text: 'Đoạn văn vừa bổ sung sau khi sửa.' }],
        },
      ],
    };

    // Step 3: Export modified and re-import
    const buf2 = (await exportDocx(modifiedAst, { outputType: 'buffer' })) as Buffer;
    const ast2 = await importDocx(buf2);

    expect(ast2.content?.length).toBe(2);
    expect(JSON.stringify(ast2)).toContain('Bản thảo ban đầu.');
    expect(JSON.stringify(ast2)).toContain('Đoạn văn vừa bổ sung sau khi sửa.');
  });
});
