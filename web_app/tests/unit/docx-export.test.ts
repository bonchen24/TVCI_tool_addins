import { describe, it, expect } from 'vitest';
import JSZip from 'jszip';
import type { JSONContent } from '@/docx';
import {
  exportDocx,
  buildDocxDocument,
  mmToTwip,
  ptToTwip,
  ptToHalfPoints,
  spacingMultipleToTwip,
  A4_PAGE_GEOMETRY,
  ADMIN_TABLE_DXA,
} from '@/docx';

describe('DOCX Exporter Engine', () => {
  describe('Unit Conversions for OpenXML Generation', () => {
    it('converts millimeter margins to twips (1mm = 1440/25.4 twips)', () => {
      expect(mmToTwip(20)).toBe(1134); // 20mm
      expect(mmToTwip(30)).toBe(1701); // 30mm
      expect(mmToTwip(15)).toBe(850);  // 15mm
    });

    it('converts typographic points to half-points (1pt = 2 half-points)', () => {
      expect(ptToHalfPoints(13)).toBe(26);
      expect(ptToHalfPoints(14)).toBe(28);
      expect(ptToHalfPoints(12)).toBe(24);
      expect(ptToHalfPoints(11)).toBe(22);
    });

    it('converts typographic points to twips (1pt = 20 twips)', () => {
      expect(ptToTwip(2)).toBe(40);
      expect(ptToTwip(6)).toBe(120);
    });

    it('converts line spacing multiple to twips (1.0 = 240 twips)', () => {
      expect(spacingMultipleToTwip(1.0)).toBe(240);
      expect(spacingMultipleToTwip(1.15)).toBe(276);
      expect(spacingMultipleToTwip(1.2)).toBe(288);
      expect(spacingMultipleToTwip(1.5)).toBe(360);
    });
  });

  describe('Full Document Export & Package Validity', () => {
    const sampleDoc: JSONContent = {
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
                      content: [{ type: 'text', text: 'VIỆN CƠ KHÍ NĂNG LƯỢNG VÀ MỎ' }],
                    },
                    {
                      type: 'adminRule',
                      attrs: { kind: 'AGENCY', widthPercent: 40 },
                    },
                    {
                      type: 'paragraph',
                      attrs: { textAlign: 'center', fontFamily: 'Times New Roman', fontSize: 13 },
                      content: [{ type: 'text', text: 'Số: 10/VKH-VP' }],
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
                  ],
                },
              ],
            },
          ],
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
              text: 'Kính gửi: Các phòng ban, đơn vị trực thuộc Viện Cơ khí Năng lượng và Mỏ.',
            },
          ],
        },
      ],
    };

    it('generates a valid DOCX Buffer with standard PK zip header', async () => {
      const buffer = (await exportDocx(sampleDoc, { outputType: 'buffer' })) as Buffer;

      expect(buffer).toBeDefined();
      expect(buffer.length).toBeGreaterThan(1000);

      // Verify standard zip header: 0x50 0x4B 0x03 0x04 (PK..)
      expect(buffer[0]).toBe(0x50);
      expect(buffer[1]).toBe(0x4b);
      expect(buffer[2]).toBe(0x03);
      expect(buffer[3]).toBe(0x04);
    });

    it('contains all mandatory OpenXML parts in the zip archive', async () => {
      const buffer = (await exportDocx(sampleDoc, { outputType: 'buffer' })) as Buffer;
      const zip = await JSZip.loadAsync(buffer);

      expect(zip.file('[Content_Types].xml')).not.toBeNull();
      expect(zip.file('_rels/.rels')).not.toBeNull();
      expect(zip.file('word/document.xml')).not.toBeNull();
      expect(zip.file('word/styles.xml')).not.toBeNull();
      expect(zip.file('word/_rels/document.xml.rels')).not.toBeNull();
    });

    it('serializes A4 geometry and ND 30 margins in word/document.xml', async () => {
      const buffer = (await exportDocx(sampleDoc, { outputType: 'buffer' })) as Buffer;
      const zip = await JSZip.loadAsync(buffer);
      const documentXml = await zip.file('word/document.xml')!.async('string');

      // Verify page size
      expect(documentXml).toContain(`w:w="${A4_PAGE_GEOMETRY.width}"`);
      expect(documentXml).toContain(`w:h="${A4_PAGE_GEOMETRY.height}"`);

      // Verify margins: top 1134, bottom 1134, left 1701, right 850
      expect(documentXml).toContain(`w:top="${A4_PAGE_GEOMETRY.margins.top}"`);
      expect(documentXml).toContain(`w:bottom="${A4_PAGE_GEOMETRY.margins.bottom}"`);
      expect(documentXml).toContain(`w:left="${A4_PAGE_GEOMETRY.margins.left}"`);
      expect(documentXml).toContain(`w:right="${A4_PAGE_GEOMETRY.margins.right}"`);
    });

    it('serializes typography, paragraph spacing, and line spacing in XML', async () => {
      const buffer = (await exportDocx(sampleDoc, { outputType: 'buffer' })) as Buffer;
      const zip = await JSZip.loadAsync(buffer);
      const documentXml = await zip.file('word/document.xml')!.async('string');

      // Font Family
      expect(documentXml).toContain('w:ascii="Times New Roman"');

      // Font size in half-points: 13pt -> 26, 14pt -> 28
      expect(documentXml).toContain('w:sz w:val="26"');
      expect(documentXml).toContain('w:sz w:val="28"');

      // Line spacing 1.2 -> 288
      expect(documentXml).toContain('w:line="288"');

      // Paragraph spacing 2pt -> 40 twips
      expect(documentXml).toContain('w:before="40"');
      expect(documentXml).toContain('w:after="40"');

      // Vietnamese Unicode integrity
      expect(documentXml).toContain('CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM');
      expect(documentXml).toContain('Độc lập - Tự do - Hạnh phúc');
    });

    it('serializes administrative tables with borderless configuration and DXA column widths', async () => {
      const buffer = (await exportDocx(sampleDoc, { outputType: 'buffer' })) as Buffer;
      const zip = await JSZip.loadAsync(buffer);
      const documentXml = await zip.file('word/document.xml')!.async('string');

      // Borderless tables use w:val="none"
      expect(documentXml).toContain('w:val="none"');

      // Check header column widths: 4210 and 5145
      expect(documentXml).toContain(`w:w="${ADMIN_TABLE_DXA.header.left}"`);
      expect(documentXml).toContain(`w:w="${ADMIN_TABLE_DXA.header.right}"`);
    });
  });
});
