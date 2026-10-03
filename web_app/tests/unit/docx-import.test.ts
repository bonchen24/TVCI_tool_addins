import { describe, it, expect, vi } from 'vitest';
import JSZip from 'jszip';
import {
  importDocx,
  parseDocxWithOpenXml,
  parseDocxWithMammoth,
  createDefaultDocument,
  halfPointsToPt,
  twipToMm,
  twipToPt,
  twipToSpacingMultiple,
  normalizeBuffer,
  parseXmlDocument,
} from '@/docx';

describe('DOCX Importer Engine', () => {
  describe('Unit Conversions for OpenXML', () => {
    it('converts half-points (w:sz) to typographic points correctly', () => {
      expect(halfPointsToPt(22)).toBe(11);
      expect(halfPointsToPt(24)).toBe(12);
      expect(halfPointsToPt(26)).toBe(13); // standard ND 30 body text
      expect(halfPointsToPt(28)).toBe(14); // title / motto
      expect(halfPointsToPt(32)).toBe(16);
    });

    it('converts twips to millimeters (dxa to mm) accurately', () => {
      expect(twipToMm(1134)).toBeCloseTo(20.0, 1); // 20mm top/bottom margin
      expect(twipToMm(1701)).toBeCloseTo(30.0, 1); // 30mm left margin
      expect(twipToMm(850)).toBeCloseTo(15.0, 1); // 15mm right margin
      expect(twipToMm(567)).toBeCloseTo(10.0, 1); // 10mm indent
    });

    it('converts twips to typographic points (1 pt = 20 twips)', () => {
      expect(twipToPt(40)).toBe(2);
      expect(twipToPt(120)).toBe(6);
      expect(twipToPt(240)).toBe(12);
    });

    it('converts OpenXML line spacing twips (240th base) to multipliers', () => {
      expect(twipToSpacingMultiple(240)).toBe(1.0);
      expect(twipToSpacingMultiple(276)).toBe(1.15);
      expect(twipToSpacingMultiple(288)).toBe(1.2); // standard ND 30 spacing
      expect(twipToSpacingMultiple(360)).toBe(1.5);
    });
  });

  describe('Input Normalization', () => {
    it('accepts ArrayBuffer and Uint8Array interchangeably', () => {
      const u8 = new Uint8Array([1, 2, 3, 4]);
      const normalized = normalizeBuffer(u8);
      expect(normalized).toBeInstanceOf(ArrayBuffer);
      expect(normalized.byteLength).toBe(4);
    });
  });

  describe('OpenXML XML Parsing & Structure Extraction', () => {
    it('reports that DOCX XML parsing requires the browser DOMParser when unavailable', () => {
      vi.stubGlobal('DOMParser', undefined);
      try {
        expect(() => parseXmlDocument('<root />')).toThrow('DOMParser is not available in current environment');
      } finally {
        vi.unstubAllGlobals();
      }
    });

    async function createTestDocxZip(documentXml: string): Promise<ArrayBuffer> {
      const zip = new JSZip();
      zip.file(
        '[Content_Types].xml',
        `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
        <Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
          <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
        </Types>`
      );
      zip.file('word/document.xml', documentXml);
      return await zip.generateAsync({ type: 'arraybuffer' });
    }

    it('extracts paragraphs, text formatting, and alignments from OpenXML', async () => {
      const xml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
      <w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
        <w:body>
          <w:p>
            <w:pPr>
              <w:jc w:val="center"/>
              <w:spacing w:line="288" w:lineRule="auto" w:before="40" w:after="40"/>
            </w:pPr>
            <w:r>
              <w:rPr>
                <w:rFonts w:ascii="Times New Roman"/>
                <w:sz w:val="28"/>
                <w:b/>
              </w:rPr>
              <w:t>CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</w:t>
            </w:r>
          </w:p>
          <w:p>
            <w:pPr>
              <w:jc w:val="both"/>
              <w:ind w:firstLine="567"/>
            </w:pPr>
            <w:r>
              <w:rPr>
                <w:sz w:val="26"/>
                <w:i/>
              </w:rPr>
              <w:t>Đoạn văn hành chính có thụt lề đầu dòng.</w:t>
            </w:r>
          </w:p>
        </w:body>
      </w:document>`;

      const docxBuffer = await createTestDocxZip(xml);
      const json = await parseDocxWithOpenXml(docxBuffer);

      expect(json.type).toBe('doc');
      expect(json.content).toBeDefined();
      expect(json.content!.length).toBe(2);

      // Paragraph 1: Motto
      const p1 = json.content![0];
      expect(p1.type).toBe('paragraph');
      expect(p1.attrs?.textAlign).toBe('center');
      expect(p1.attrs?.lineSpacing).toBe(1.2);
      expect(p1.attrs?.spaceBefore).toBe(2);
      expect(p1.content![0].text).toBe('CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM');
      expect(p1.content![0].marks?.some((m: any) => m.type === 'bold')).toBe(true);
      expect(p1.attrs?.fontSize).toBe(14);

      // Paragraph 2: Justified text with indent
      const p2 = json.content![1];
      expect(p2.attrs?.textAlign).toBe('justify');
      expect(p2.attrs?.firstLineIndentMm).toBeCloseTo(10.0, 1);
      expect(p2.content![0].marks?.some((m: any) => m.type === 'italic')).toBe(true);
      expect(p2.attrs?.fontSize).toBe(13);
    });

    it('correctly parses tri-state toggle formatting (b, i, u)', async () => {
      const xml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
      <w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
        <w:body>
          <w:p>
            <w:r>
              <w:rPr>
                <w:b w:val="0"/>
                <w:u w:val="single"/>
              </w:rPr>
              <w:t>Chữ gạch chân không đậm</w:t>
            </w:r>
          </w:p>
        </w:body>
      </w:document>`;

      const docxBuffer = await createTestDocxZip(xml);
      const json = await parseDocxWithOpenXml(docxBuffer);

      const p = json.content![0];
      const run = p.content![0];
      expect(run.marks?.some((m: any) => m.type === 'bold')).toBeFalsy();
      expect(run.marks?.some((m: any) => m.type === 'underline')).toBe(true);
    });

    it('classifies 2-column administrative header and footer tables', async () => {
      const xml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
      <w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
        <w:body>
          <!-- Header Table -->
          <w:tbl>
            <w:tblPr>
              <w:tblBorders>
                <w:top w:val="none"/>
                <w:left w:val="none"/>
                <w:bottom w:val="none"/>
                <w:right w:val="none"/>
              </w:tblBorders>
            </w:tblPr>
            <w:tr>
              <w:tc>
                <w:p><w:r><w:t>VIỆN CƠ KHÍ NĂNG LƯỢNG VÀ MỎ</w:t></w:r></w:p>
                <w:p><w:r><w:t>Số: 123/VKH-VP</w:t></w:r></w:p>
              </w:tc>
              <w:tc>
                <w:p><w:r><w:t>CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</w:t></w:r></w:p>
                <w:p><w:r><w:t>Độc lập - Tự do - Hạnh phúc</w:t></w:r></w:p>
              </w:tc>
            </w:tr>
          </w:tbl>

          <!-- Footer Table -->
          <w:tbl>
            <w:tblPr>
              <w:tblBorders><w:insideH w:val="none"/></w:tblBorders>
            </w:tblPr>
            <w:tr>
              <w:tc>
                <w:p><w:r><w:t>Nơi nhận: Như trên</w:t></w:r></w:p>
              </w:tc>
              <w:tc>
                <w:p><w:r><w:t>GIÁM ĐỐC</w:t></w:r></w:p>
              </w:tc>
            </w:tr>
          </w:tbl>
        </w:body>
      </w:document>`;

      const docxBuffer = await createTestDocxZip(xml);
      const json = await parseDocxWithOpenXml(docxBuffer);

      expect(json.content?.length).toBe(2);

      const headerTable = json.content![0];
      expect(headerTable.type).toBe('table');
      expect(headerTable.attrs?.tableType).toBe('admin-header');
      expect(headerTable.attrs?.isBorderless).toBe(true);
      expect(headerTable.attrs?.columnRatio).toBe('40-60');

      const footerTable = json.content![1];
      expect(footerTable.type).toBe('table');
      expect(footerTable.attrs?.tableType).toBe('admin-footer');
      expect(footerTable.attrs?.isBorderless).toBe(true);
      expect(footerTable.attrs?.columnRatio).toBe('50-50');
    });

    it('extracts AdminRule nodes from drawing lines and SDT tags', async () => {
      const xml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
      <w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"
                  xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
        <w:body>
          <w:p>
            <w:r><w:t>Độc lập - Tự do - Hạnh phúc</w:t></w:r>
          </w:p>
          <w:sdt>
            <w:sdtPr>
              <w:tag w:val="TVCI_HRULE:NATIONAL_MOTTO"/>
            </w:sdtPr>
            <w:sdtContent>
              <w:p>
                <w:r>
                  <w:drawing>
                    <a:prstGeom prst="line"/>
                  </w:drawing>
                </w:r>
              </w:p>
            </w:sdtContent>
          </w:sdt>
        </w:body>
      </w:document>`;

      const docxBuffer = await createTestDocxZip(xml);
      const json = await parseDocxWithOpenXml(docxBuffer);

      expect(json.content).toBeDefined();
      const ruleNode = json.content!.find((n: any) => n.type === 'adminRule');
      expect(ruleNode).toBeDefined();
      expect(ruleNode?.attrs?.kind).toBe('MOTTO');
      expect(ruleNode?.attrs?.widthPercent).toBe(95);
    });

    it('falls back gracefully to Mammoth or default structure when XML is damaged', async () => {
      // Intentionally corrupted buffer
      const corruptedBuffer = new Uint8Array([0x50, 0x4b, 0x03, 0x04, 0x00, 0x00]).buffer;

      // importDocx wraps errors safely and falls back
      const result = await importDocx(corruptedBuffer);
      expect(result.type).toBe('doc');
      expect(Array.isArray(result.content)).toBe(true);
    });
  });

  describe('DOCX Import Fallback & Error Handling', () => {
    it('handles empty ArrayBuffer (0 bytes) without throwing and returns valid AST', async () => {
      const emptyBuffer = new ArrayBuffer(0);
      const result = await importDocx(emptyBuffer);

      expect(result.type).toBe('doc');
      expect(Array.isArray(result.content)).toBe(true);
      expect(result.content!.length).toBeGreaterThan(0);
      expect(result.content![0].type).toBe('paragraph');
      expect(result.content![0].attrs?.fontFamily).toBe('Times New Roman');
      expect(result.content![0].attrs?.fontSize).toBe(13);
    });

    it('handles empty Uint8Array (0 bytes) without throwing and returns valid AST', async () => {
      const emptyU8 = new Uint8Array(0);
      const result = await importDocx(emptyU8);

      expect(result.type).toBe('doc');
      expect(Array.isArray(result.content)).toBe(true);
      expect(result.content!.length).toBeGreaterThan(0);
    });

    it('handles truncated zip archive header gracefully', async () => {
      // PK\x03\x04 header with truncated body
      const truncatedBuffer = new Uint8Array([0x50, 0x4b, 0x03, 0x04, 0x00, 0x00]).buffer;
      const result = await importDocx(truncatedBuffer);

      expect(result.type).toBe('doc');
      expect(Array.isArray(result.content)).toBe(true);
      expect(result.content!.length).toBeGreaterThan(0);
    });

    it('handles arbitrary non-zip binary payload gracefully', async () => {
      const nonZipBinary = new Uint8Array([
        0x00, 0xff, 0x42, 0x61, 0x64, 0x46, 0x69, 0x6c, 0x65, 0xde, 0xad, 0xbe, 0xef,
      ]).buffer;

      const result = await importDocx(nonZipBinary);
      expect(result.type).toBe('doc');
      expect(Array.isArray(result.content)).toBe(true);
      expect(result.content!.length).toBeGreaterThan(0);
    });

    it('handles forceFallback mode with damaged buffer without rejection', async () => {
      const damagedBuffer = new Uint8Array([0x01, 0x02, 0x03, 0x04]).buffer;
      const result = await importDocx(damagedBuffer, { forceFallback: true });

      expect(result.type).toBe('doc');
      expect(Array.isArray(result.content)).toBe(true);
      expect(result.content!.length).toBeGreaterThan(0);
    });

    it('handles zip archive missing word/document.xml without rejection', async () => {
      const zip = new JSZip();
      zip.file('unrelated.txt', 'This is not a docx file');
      const nonDocxZipBuffer = await zip.generateAsync({ type: 'arraybuffer' });

      const result = await importDocx(nonDocxZipBuffer);
      expect(result.type).toBe('doc');
      expect(Array.isArray(result.content)).toBe(true);
      expect(result.content!.length).toBeGreaterThan(0);
    });

    it('handles direct calls to parseDocxWithMammoth with damaged buffers safely', async () => {
      const zeroBuffer = new ArrayBuffer(0);
      const result1 = await parseDocxWithMammoth(zeroBuffer);
      expect(result1.type).toBe('doc');
      expect(result1.content!.length).toBeGreaterThan(0);

      const badBuffer = new Uint8Array([0xde, 0xad, 0xbe, 0xef]).buffer;
      const result2 = await parseDocxWithMammoth(badBuffer);
      expect(result2.type).toBe('doc');
      expect(result2.content!.length).toBeGreaterThan(0);
    });

    it('creates administrative layout fallback when requested', async () => {
      const emptyBuffer = new ArrayBuffer(0);
      const result = await importDocx(emptyBuffer, { fallbackToAdministrativeLayout: true });

      expect(result.type).toBe('doc');
      expect(result.content!.length).toBeGreaterThanOrEqual(2);
      expect(result.content![0].type).toBe('table');
      expect(result.content![0].attrs?.tableType).toBe('admin-header');
    });

    it('exports createDefaultDocument returning valid ND30 AST', () => {
      const defaultDoc = createDefaultDocument();
      expect(defaultDoc.type).toBe('doc');
      expect(defaultDoc.content).toBeDefined();
      expect(defaultDoc.content![0].type).toBe('paragraph');
      expect(defaultDoc.content![0].attrs?.fontFamily).toBe('Times New Roman');
      expect(defaultDoc.content![0].attrs?.fontSize).toBe(13);
      expect(defaultDoc.content![0].attrs?.lineSpacing).toBe(1.2);
      expect(defaultDoc.content![0].attrs?.textAlign).toBe('justify');
    });
  });

  describe('2-Column Content Table Classification & Border Preservation', () => {
    async function createTestDocxZip(documentXml: string): Promise<ArrayBuffer> {
      const zip = new JSZip();
      zip.file(
        '[Content_Types].xml',
        `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
        <Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
          <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
        </Types>`
      );
      zip.file('word/document.xml', documentXml);
      return await zip.generateAsync({ type: 'arraybuffer' });
    }

    it('preserves 2-column content tables with dates, titles, or explicit borders without stripping borders', async () => {
      const xml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
      <w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
        <w:body>
          <!-- Table 1: 2-column schedule table containing 'ngày' with explicit borders -->
          <w:tbl>
            <w:tblPr>
              <w:tblBorders>
                <w:top w:val="single" w:sz="4" w:space="0" w:color="auto"/>
                <w:left w:val="single" w:sz="4" w:space="0" w:color="auto"/>
                <w:bottom w:val="single" w:sz="4" w:space="0" w:color="auto"/>
                <w:right w:val="single" w:sz="4" w:space="0" w:color="auto"/>
                <w:insideH w:val="single" w:sz="4" w:space="0" w:color="auto"/>
                <w:insideV w:val="single" w:sz="4" w:space="0" w:color="auto"/>
              </w:tblBorders>
            </w:tblPr>
            <w:tr>
              <w:tc>
                <w:p><w:r><w:t>Hạng mục tiến độ</w:t></w:r></w:p>
              </w:tc>
              <w:tc>
                <w:p><w:r><w:t>Thời hạn nộp ngày 30/12/2026</w:t></w:r></w:p>
              </w:tc>
            </w:tr>
          </w:tbl>

          <!-- Table 2: 2-column staff list containing 'trưởng phòng' with explicit borders -->
          <w:tbl>
            <w:tblPr>
              <w:tblBorders>
                <w:top w:val="single" w:sz="4"/>
                <w:left w:val="single" w:sz="4"/>
                <w:bottom w:val="single" w:sz="4"/>
                <w:right w:val="single" w:sz="4"/>
              </w:tblBorders>
            </w:tblPr>
            <w:tr>
              <w:tc>
                <w:p><w:r><w:t>Phòng Ban</w:t></w:r></w:p>
              </w:tc>
              <w:tc>
                <w:p><w:r><w:t>Trưởng phòng kỹ thuật</w:t></w:r></w:p>
              </w:tc>
            </w:tr>
          </w:tbl>

          <!-- Table 3: 2-column data table without tblBorders tag (default grid) containing dates -->
          <w:tbl>
            <w:tr>
              <w:tc>
                <w:p><w:r><w:t>Sản phẩm đợt 1</w:t></w:r></w:p>
              </w:tc>
              <w:tc>
                <w:p><w:r><w:t>Ngày bàn giao: 15/10/2026</w:t></w:r></w:p>
              </w:tc>
            </w:tr>
          </w:tbl>

          <!-- Table 4: 2-column data table with 'độc lập' not part of National Motto -->
          <w:tbl>
            <w:tblPr>
              <w:tblBorders>
                <w:top w:val="single" w:sz="4"/>
                <w:left w:val="single" w:sz="4"/>
                <w:bottom w:val="single" w:sz="4"/>
                <w:right w:val="single" w:sz="4"/>
              </w:tblBorders>
            </w:tblPr>
            <w:tr>
              <w:tc>
                <w:p><w:r><w:t>Loại hình đơn vị</w:t></w:r></w:p>
              </w:tc>
              <w:tc>
                <w:p><w:r><w:t>Công ty kiểm toán độc lập</w:t></w:r></w:p>
              </w:tc>
            </w:tr>
          </w:tbl>
        </w:body>
      </w:document>`;

      const docxBuffer = await createTestDocxZip(xml);
      const json = await parseDocxWithOpenXml(docxBuffer);

      expect(json.content?.length).toBe(4);

      // Table 1: Schedule with 'ngày' and visible borders
      const scheduleTable = json.content![0];
      expect(scheduleTable.type).toBe('table');
      expect(scheduleTable.attrs?.tableType).toBe('content');
      expect(scheduleTable.attrs?.isBorderless).toBe(false);
      expect(scheduleTable.attrs?.borderless).toBe(false);
      expect(scheduleTable.attrs?.columnRatio).toBe('custom');

      // Table 2: Staff with 'trưởng phòng' and visible borders
      const staffTable = json.content![1];
      expect(staffTable.type).toBe('table');
      expect(staffTable.attrs?.tableType).toBe('content');
      expect(staffTable.attrs?.isBorderless).toBe(false);
      expect(staffTable.attrs?.borderless).toBe(false);
      expect(staffTable.attrs?.columnRatio).toBe('custom');

      // Table 3: Data table without explicit tblBorders
      const defaultTable = json.content![2];
      expect(defaultTable.type).toBe('table');
      expect(defaultTable.attrs?.tableType).toBe('content');
      expect(defaultTable.attrs?.isBorderless).toBe(false);
      expect(defaultTable.attrs?.borderless).toBe(false);
      expect(defaultTable.attrs?.columnRatio).toBe('custom');

      // Table 4: Independent audit table ('độc lập' without 'hạnh phúc')
      const auditTable = json.content![3];
      expect(auditTable.type).toBe('table');
      expect(auditTable.attrs?.tableType).toBe('content');
      expect(auditTable.attrs?.isBorderless).toBe(false);
      expect(auditTable.attrs?.borderless).toBe(false);
    });
  });

  describe('Tab Characters and Indentation Handling', () => {
    async function createTestDocxZip(documentXml: string): Promise<ArrayBuffer> {
      const zip = new JSZip();
      zip.file(
        '[Content_Types].xml',
        `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
        <Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
          <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
        </Types>`
      );
      zip.file('word/document.xml', documentXml);
      return await zip.generateAsync({ type: 'arraybuffer' });
    }

    it('preserves <w:tab/> elements within runs and across runs', async () => {
      const xml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
      <w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
        <w:body>
          <w:p>
            <w:r>
              <w:t>Kính gửi:</w:t>
              <w:tab/>
              <w:t>- Ban Giám đốc Viện</w:t>
            </w:r>
          </w:p>
          <w:p>
            <w:r><w:t>Hà Nội,</w:t></w:r>
            <w:r><w:tab/></w:r>
            <w:r><w:t>ngày 15 tháng 8 năm 2026</w:t></w:r>
          </w:p>
        </w:body>
      </w:document>`;

      const docxBuffer = await createTestDocxZip(xml);
      const json = await parseDocxWithOpenXml(docxBuffer);

      expect(json.content?.length).toBe(2);

      // Paragraph 1: Intra-run tab
      const p1 = json.content![0];
      expect(p1.content?.length).toBe(3);
      expect(p1.content![0].text).toBe('Kính gửi:');
      expect(p1.content![1].text).toBe('\t');
      expect(p1.content![2].text).toBe('- Ban Giám đốc Viện');

      // Paragraph 2: Standalone tab run
      const p2 = json.content![1];
      expect(p2.content?.length).toBe(3);
      expect(p2.content![0].text).toBe('Hà Nội,');
      expect(p2.content![1].text).toBe('\t');
      expect(p2.content![2].text).toBe('ngày 15 tháng 8 năm 2026');
    });

    it('parses <w:ind w:hanging="..."> as negative firstLineIndentMm and hangingIndentMm', async () => {
      const xml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
      <w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
        <w:body>
          <w:p>
            <w:pPr>
              <w:ind w:left="720" w:hanging="720"/>
            </w:pPr>
            <w:r><w:t>- Các phòng ban trực thuộc;</w:t></w:r>
          </w:p>
          <w:p>
            <w:pPr>
              <w:ind w:hanging="567"/>
            </w:pPr>
            <w:r><w:t>Đoạn văn thụt treo 10mm.</w:t></w:r>
          </w:p>
        </w:body>
      </w:document>`;

      const docxBuffer = await createTestDocxZip(xml);
      const json = await parseDocxWithOpenXml(docxBuffer);

      expect(json.content?.length).toBe(2);

      // Paragraph 1: 720 twips = 12.7mm hanging
      const p1 = json.content![0];
      expect(p1.attrs?.firstLineIndentMm).toBeCloseTo(-12.7, 1);
      expect(p1.attrs?.hangingIndentMm).toBeCloseTo(12.7, 1);

      // Paragraph 2: 567 twips = 10.0mm hanging
      const p2 = json.content![1];
      expect(p2.attrs?.firstLineIndentMm).toBeCloseTo(-10.0, 1);
      expect(p2.attrs?.hangingIndentMm).toBeCloseTo(10.0, 1);
    });

    it('defaults body paragraphs without <w:ind> to 0mm first line indent', async () => {
      const xml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
      <w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
        <w:body>
          <w:p>
            <w:pPr>
              <w:jc w:val="left"/>
            </w:pPr>
            <w:r><w:t>Đoạn văn căn trái không thụt dòng.</w:t></w:r>
          </w:p>
          <w:p>
            <w:pPr>
              <w:jc w:val="both"/>
            </w:pPr>
            <w:r><w:t>Đoạn văn căn đều không thụt dòng.</w:t></w:r>
          </w:p>
        </w:body>
      </w:document>`;

      const docxBuffer = await createTestDocxZip(xml);
      const json = await parseDocxWithOpenXml(docxBuffer);

      expect(json.content?.length).toBe(2);
      expect(json.content![0].attrs?.firstLineIndentMm).toBe(0);
      expect(json.content![1].attrs?.firstLineIndentMm).toBe(0);
    });

    it('ensures table cells and headings never default to 10mm indent', async () => {
      const xml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
      <w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
        <w:body>
          <w:p>
            <w:pPr>
              <w:pStyle w:val="Heading1"/>
            </w:pPr>
            <w:r><w:t>Tiêu đề chương 1</w:t></w:r>
          </w:p>
          <w:tbl>
            <w:tr>
              <w:tc>
                <w:p>
                  <w:r><w:t>Nội dung ô bảng</w:t></w:r>
                </w:p>
              </w:tc>
            </w:tr>
          </w:tbl>
        </w:body>
      </w:document>`;

      const docxBuffer = await createTestDocxZip(xml);
      const json = await parseDocxWithOpenXml(docxBuffer);

      expect(json.content?.length).toBe(2);

      // Node 0: Heading 1
      const heading = json.content![0];
      expect(heading.type).toBe('heading');
      expect(heading.attrs?.level).toBe(1);
      expect(heading.attrs?.firstLineIndentMm).toBeUndefined();

      // Node 1: Table Cell Paragraph
      const table = json.content![1];
      const cell = table.content![0].content![0];
      const cellParagraph = cell.content![0];
      expect(cellParagraph.type).toBe('paragraph');
      expect(cellParagraph.attrs?.firstLineIndentMm).toBe(0);
    });

    it('preserves text formatting marks on tab characters within formatted runs', async () => {
      const xml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
      <w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
        <w:body>
          <w:p>
            <w:r>
              <w:rPr>
                <w:b/>
                <w:i/>
              </w:rPr>
              <w:t>Mục 1</w:t>
              <w:tab/>
              <w:t>Chi tiết 1</w:t>
            </w:r>
          </w:p>
        </w:body>
      </w:document>`;

      const docxBuffer = await createTestDocxZip(xml);
      const json = await parseDocxWithOpenXml(docxBuffer);

      const p = json.content![0];
      const tabNode = p.content![1];
      expect(tabNode.text).toBe('\t');
      expect(tabNode.marks?.some((m: any) => m.type === 'bold')).toBe(true);
      expect(tabNode.marks?.some((m: any) => m.type === 'italic')).toBe(true);
    });
  });
});
