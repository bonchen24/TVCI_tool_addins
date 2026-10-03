import { describe, it, expect } from 'vitest';
import {
  evaluateDocumentRules,
  validatePageSetup,
  validateComponentParagraph,
  classifyDocumentComponents,
  getComponentRule,
  type ParagraphSnapshot,
  type PageSetupSnapshot,
} from '@/rules';

describe('Format Engine: NĐ 30/2020 Administrative Format Evaluation', () => {
  const standardPage: PageSetupSnapshot = {
    paperSize: 'A4',
    orientation: 'Portrait',
    topMm: 20,
    bottomMm: 20,
    leftMm: 30,
    rightMm: 15,
  };

  it('evaluates blank document and returns isBlankDocument: true and healthScore: 0', () => {
    const summary = evaluateDocumentRules([], 'NĐ30_TVCI');
    expect(summary.isBlankDocument).toBe(true);
    expect(summary.healthScore).toBe(0);
    expect(summary.applicableRules).toBe(0);
    expect(summary.issues).toHaveLength(0);
  });

  it('validates National Emblem (Quốc hiệu) formatting according to NĐ 30', () => {
    const validSnapshot: ParagraphSnapshot = {
      id: 'node-1',
      text: 'CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM',
      fontName: 'Times New Roman',
      fontSize: 12,
      bold: true,
      italic: false,
      alignment: 'Centered',
      spaceBefore: 0,
      spaceAfter: 0,
    };

    const rule = getComponentRule('NĐ30_TVCI', 'NATIONAL_EMBLEM');
    const issues = validateComponentParagraph(validSnapshot, 'NATIONAL_EMBLEM', rule);
    expect(issues).toHaveLength(0);

    const invalidSnapshot: ParagraphSnapshot = {
      ...validSnapshot,
      fontName: 'Arial',
      fontSize: 16,
      bold: false,
      alignment: 'Left',
    };
    const invalidIssues = validateComponentParagraph(invalidSnapshot, 'NATIONAL_EMBLEM', rule);
    expect(invalidIssues.length).toBeGreaterThanOrEqual(4);
    expect(invalidIssues.some((i) => i.ruleId === 'component.NATIONAL_EMBLEM.fontName')).toBe(true);
    expect(invalidIssues.some((i) => i.ruleId === 'component.NATIONAL_EMBLEM.fontSize')).toBe(true);
    expect(invalidIssues.some((i) => i.ruleId === 'component.NATIONAL_EMBLEM.bold')).toBe(true);
    expect(invalidIssues.some((i) => i.ruleId === 'component.NATIONAL_EMBLEM.alignment')).toBe(true);
  });

  it('validates Motto (Tiêu ngữ) formatting: 13-14pt, bold, centered', () => {
    const validMotto: ParagraphSnapshot = {
      id: 'node-2',
      text: 'Độc lập - Tự do - Hạnh phúc',
      fontName: 'Times New Roman',
      fontSize: 13,
      bold: true,
      italic: false,
      alignment: 'Centered',
      spaceBefore: 0,
      spaceAfter: 0,
    };

    const rule = getComponentRule('NĐ30_TVCI', 'MOTTO');
    expect(validateComponentParagraph(validMotto, 'MOTTO', rule)).toHaveLength(0);

    const nonBoldMotto: ParagraphSnapshot = { ...validMotto, bold: false };
    const issues = validateComponentParagraph(nonBoldMotto, 'MOTTO', rule);
    expect(issues.some((i) => i.ruleId === 'component.MOTTO.bold')).toBe(true);
  });

  it('validates Agency Name (Tên cơ quan ban hành): 12-13pt, centered', () => {
    const validAgency: ParagraphSnapshot = {
      id: 'node-0',
      text: 'TRUNG TÂM THỬ NGHIỆM - KIỂM ĐỊNH CÔNG NGHIỆP',
      fontName: 'Times New Roman',
      fontSize: 12.5,
      bold: false,
      italic: false,
      alignment: 'Centered',
      spaceBefore: 0,
      spaceAfter: 0,
    };
    const rule = getComponentRule('NĐ30_TVCI', 'AGENCY_NAME');
    expect(validateComponentParagraph(validAgency, 'AGENCY_NAME', rule)).toHaveLength(0);
  });

  it('validates Place & Date (Địa danh và ngày tháng): 13-14pt, italic, right-aligned', () => {
    const validPlaceDate: ParagraphSnapshot = {
      id: 'node-3',
      text: 'Hà Nội, ngày 29 tháng 9 năm 2026',
      fontName: 'Times New Roman',
      fontSize: 13,
      bold: false,
      italic: true,
      alignment: 'Right',
      spaceBefore: 0,
      spaceAfter: 0,
    };
    const rule = getComponentRule('NĐ30_TVCI', 'PLACE_DATE');
    expect(validateComponentParagraph(validPlaceDate, 'PLACE_DATE', rule)).toHaveLength(0);

    const leftAligned: ParagraphSnapshot = { ...validPlaceDate, alignment: 'Left', italic: false };
    const issues = validateComponentParagraph(leftAligned, 'PLACE_DATE', rule);
    expect(issues.some((i) => i.ruleId === 'component.PLACE_DATE.alignment')).toBe(true);
    expect(issues.some((i) => i.ruleId === 'component.PLACE_DATE.italic')).toBe(true);
  });

  it('validates Document Type (Tên loại) and Abstract (Trích yếu)', () => {
    const docType: ParagraphSnapshot = {
      id: 'node-4',
      text: 'QUYẾT ĐỊNH',
      fontName: 'Times New Roman',
      fontSize: 14,
      bold: true,
      italic: false,
      alignment: 'Centered',
      spaceBefore: 6,
      spaceAfter: 6,
    };
    const docTypeRule = getComponentRule('NĐ30_TVCI', 'DOCUMENT_TYPE');
    expect(validateComponentParagraph(docType, 'DOCUMENT_TYPE', docTypeRule)).toHaveLength(0);

    const abstractSnap: ParagraphSnapshot = {
      id: 'node-5',
      text: 'Về việc ban hành quy chế làm việc',
      fontName: 'Times New Roman',
      fontSize: 13,
      bold: true,
      italic: false,
      alignment: 'Centered',
      spaceBefore: 2,
      spaceAfter: 2,
    };
    const abstractRule = getComponentRule('NĐ30_TVCI', 'ABSTRACT');
    expect(validateComponentParagraph(abstractSnap, 'ABSTRACT', abstractRule)).toHaveLength(0);
  });

  it('validates Body paragraph formatting rules (font, size, alignment, indent, spacing)', () => {
    const compliantDoc: ParagraphSnapshot[] = [
      {
        id: 'node-0',
        text: 'CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM',
        fontName: 'Times New Roman',
        fontSize: 12,
        bold: true,
        alignment: 'Centered',
        spaceBefore: 0,
        spaceAfter: 0,
      },
      {
        id: 'node-1',
        text: 'Độc lập - Tự do - Hạnh phúc',
        fontName: 'Times New Roman',
        fontSize: 13,
        bold: true,
        alignment: 'Centered',
        spaceBefore: 0,
        spaceAfter: 0,
      },
      {
        id: 'node-2',
        text: 'Số: 123/QĐ-TVCI',
        fontName: 'Times New Roman',
        fontSize: 13,
        alignment: 'Centered',
        spaceBefore: 0,
        spaceAfter: 0,
      },
      {
        id: 'node-3',
        text: 'Hà Nội, ngày 29 tháng 09 năm 2026',
        fontName: 'Times New Roman',
        fontSize: 13,
        italic: true,
        alignment: 'Right',
        spaceBefore: 0,
        spaceAfter: 0,
      },
      {
        id: 'node-4',
        text: 'QUYẾT ĐỊNH',
        fontName: 'Times New Roman',
        fontSize: 14,
        bold: true,
        alignment: 'Centered',
        spaceBefore: 6,
        spaceAfter: 6,
      },
      {
        id: 'node-5',
        text: 'Về việc chuẩn hóa thể thức',
        fontName: 'Times New Roman',
        fontSize: 13,
        bold: true,
        alignment: 'Centered',
        spaceBefore: 2,
        spaceAfter: 2,
      },
      {
        id: 'node-6',
        text: 'Thực hiện quy định tại Nghị định 30/2020/NĐ-CP về công tác văn thư, toàn bộ các cơ quan và đơn vị áp dụng quy chuẩn thống nhất.',
        fontName: 'Times New Roman',
        fontSize: 13,
        alignment: 'Justified',
        firstLineIndentMm: 10,
        lineSpacingMultiple: 1.2,
        spaceBefore: 2,
        spaceAfter: 2,
      },
      {
        id: 'node-7',
        text: 'GIÁM ĐỐC',
        fontName: 'Times New Roman',
        fontSize: 13,
        bold: true,
        alignment: 'Centered',
        spaceBefore: 0,
        spaceAfter: 0,
      },
      {
        id: 'node-8',
        text: 'Nguyễn Văn A',
        fontName: 'Times New Roman',
        fontSize: 13,
        bold: true,
        alignment: 'Centered',
        spaceBefore: 0,
        spaceAfter: 0,
      },
      {
        id: 'node-9',
        text: 'Nơi nhận:\n- Như trên;\n- Lưu: VT.',
        fontName: 'Times New Roman',
        fontSize: 12,
        italic: true,
        alignment: 'Left',
        spaceBefore: 0,
        spaceAfter: 0,
      },
    ];

    const summary = evaluateDocumentRules({
      profileId: 'NĐ30_TVCI',
      validationScope: 'document',
      paragraphSnapshots: compliantDoc,
      pageSnapshot: standardPage,
    });

    expect(summary.isBlankDocument).toBe(false);
    expect(summary.healthScore).toBeGreaterThanOrEqual(90);
    const bodyResult = summary.results.find((r) => r.ruleId === 'body.alignment');
    expect(bodyResult?.status).toBe('PASS');
  });

  it('validates Page setup boundaries with tolerance', () => {
    const rules = {
      paperSize: 'A4' as const,
      orientation: 'Portrait' as const,
      topMm: { min: 20, max: 25, target: 20 },
      bottomMm: { min: 20, max: 25, target: 20 },
      leftMm: { min: 30, max: 35, target: 30 },
      rightMm: { min: 15, max: 20, target: 15 },
    };

    const validSetup: PageSetupSnapshot = {
      paperSize: 'A4',
      orientation: 'Portrait',
      topMm: 21,
      bottomMm: 22,
      leftMm: 32,
      rightMm: 16,
    };
    expect(validatePageSetup(validSetup, rules)).toHaveLength(0);

    const invalidSetup: PageSetupSnapshot = {
      paperSize: 'Letter',
      orientation: 'Landscape',
      topMm: 10,
      bottomMm: 35,
      leftMm: 15,
      rightMm: 10,
    };
    const pageIssues = validatePageSetup(invalidSetup, rules);
    expect(pageIssues.length).toBe(6);
  });

  it('handles snapshot arrays with null, undefined, empty, or whitespace-only text gracefully without throwing', () => {
    const malformedDoc: ParagraphSnapshot[] = [
      { id: 'node-null-1', text: null as any, fontName: 'Times New Roman', fontSize: 12, alignment: 'Left', spaceBefore: 0, spaceAfter: 0 },
      { id: 'node-0', text: 'CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM', fontName: 'Times New Roman', fontSize: 12, bold: true, alignment: 'Centered', spaceBefore: 0, spaceAfter: 0 },
      { id: 'node-undef-1', text: undefined as any, fontName: 'Times New Roman', fontSize: 12, alignment: 'Left', spaceBefore: 0, spaceAfter: 0 },
      { id: 'node-1', text: 'Độc lập - Tự do - Hạnh phúc', fontName: 'Times New Roman', fontSize: 13, bold: true, alignment: 'Centered', spaceBefore: 0, spaceAfter: 0 },
      { id: 'node-empty-1', text: '', fontName: 'Times New Roman', fontSize: 12, alignment: 'Left', spaceBefore: 0, spaceAfter: 0 },
      { id: 'node-ws-1', text: '   \n  \t  ', fontName: 'Times New Roman', fontSize: 12, alignment: 'Left', spaceBefore: 0, spaceAfter: 0 },
      { id: 'node-4', text: 'QUYẾT ĐỊNH', fontName: 'Times New Roman', fontSize: 14, bold: true, alignment: 'Centered', spaceBefore: 0, spaceAfter: 0 },
      { id: 'node-null-2', text: null as any, fontName: 'Times New Roman', fontSize: 12, alignment: 'Left', spaceBefore: 0, spaceAfter: 0 },
    ];

    expect(() => {
      const summary = evaluateDocumentRules({
        profileId: 'NĐ30_TVCI',
        validationScope: 'document',
        paragraphSnapshots: malformedDoc,
        pageSnapshot: standardPage,
      });

      expect(summary.isBlankDocument).toBe(false);
      expect(typeof summary.healthScore).toBe('number');
      expect(summary.healthScore).toBeGreaterThan(0);
    }).not.toThrow();

    const allNullishDoc: ParagraphSnapshot[] = [
      { id: 'n1', text: null as any, fontName: 'Times New Roman', fontSize: 13, alignment: 'Left', spaceBefore: 0, spaceAfter: 0 },
      { id: 'n2', text: undefined as any, fontName: 'Times New Roman', fontSize: 13, alignment: 'Left', spaceBefore: 0, spaceAfter: 0 },
      { id: 'n3', text: '   ', fontName: 'Times New Roman', fontSize: 13, alignment: 'Left', spaceBefore: 0, spaceAfter: 0 },
    ];
    const blankSummary = evaluateDocumentRules({
      profileId: 'NĐ30_TVCI',
      validationScope: 'document',
      paragraphSnapshots: allNullishDoc,
      pageSnapshot: standardPage,
    });
    expect(blankSummary.isBlankDocument).toBe(true);
    expect(blankSummary.healthScore).toBe(0);
    expect(blankSummary.issues).toHaveLength(0);
  });

  it('correctly classifies and evaluates Vietnamese administrative components in Unicode NFD (Decomposed Diacritics)', () => {
    const nfdEmblem = 'CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM'.normalize('NFD');
    const nfdMotto = 'Độc lập - Tự do - Hạnh phúc'.normalize('NFD');
    const nfdSymbol = 'Số: 123/QĐ-TVCI'.normalize('NFD');
    const nfdPlaceDate = 'Hà Nội, ngày 29 tháng 09 năm 2026'.normalize('NFD');
    const nfdDocType = 'QUYẾT ĐỊNH'.normalize('NFD');
    const nfdAbstract = 'Về việc ban hành quy chế làm việc'.normalize('NFD');
    const nfdBody = 'Thực hiện quy định tại Nghị định 30/2020/NĐ-CP về công tác văn thư, toàn bộ các đơn vị áp dụng quy chuẩn thống nhất.'.normalize('NFD');
    const nfdSignerRole = 'GIÁM ĐỐC'.normalize('NFD');
    const nfdSignerName = 'Nguyễn Văn A'.normalize('NFD');
    const nfdRecipients = 'Nơi nhận:\n- Như trên;\n- Lưu: VT.'.normalize('NFD');

    expect(nfdEmblem).not.toBe('CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM');
    expect(nfdMotto).not.toBe('Độc lập - Tự do - Hạnh phúc');

    const rawNfdParagraphs = [
      nfdEmblem,
      nfdMotto,
      nfdSymbol,
      nfdPlaceDate,
      nfdDocType,
      nfdAbstract,
      nfdBody,
      nfdSignerRole,
      nfdSignerName,
      nfdRecipients,
    ];
    const classified = classifyDocumentComponents(rawNfdParagraphs, 'ADMINISTRATIVE');

    expect(classified.some((c) => c.type === 'NATIONAL_EMBLEM')).toBe(true);
    expect(classified.some((c) => c.type === 'MOTTO')).toBe(true);
    expect(classified.some((c) => c.type === 'PLACE_DATE')).toBe(true);
    expect(classified.some((c) => c.type === 'DOCUMENT_TYPE')).toBe(true);
    expect(classified.some((c) => c.type === 'SIGNER_ROLE')).toBe(true);
    expect(classified.some((c) => c.type === 'RECIPIENTS')).toBe(true);

    const nfdDoc: ParagraphSnapshot[] = [
      { id: 'p0', text: nfdEmblem, fontName: 'Times New Roman', fontSize: 12, bold: true, alignment: 'Centered', spaceBefore: 0, spaceAfter: 0 },
      { id: 'p1', text: nfdMotto, fontName: 'Times New Roman', fontSize: 13, bold: true, alignment: 'Centered', spaceBefore: 0, spaceAfter: 0 },
      { id: 'p2', text: nfdSymbol, fontName: 'Times New Roman', fontSize: 13, alignment: 'Centered', spaceBefore: 0, spaceAfter: 0 },
      { id: 'p3', text: nfdPlaceDate, fontName: 'Times New Roman', fontSize: 13, italic: true, alignment: 'Right', spaceBefore: 0, spaceAfter: 0 },
      { id: 'p4', text: nfdDocType, fontName: 'Times New Roman', fontSize: 14, bold: true, alignment: 'Centered', spaceBefore: 6, spaceAfter: 6 },
      { id: 'p5', text: nfdAbstract, fontName: 'Times New Roman', fontSize: 13, bold: true, alignment: 'Centered', spaceBefore: 2, spaceAfter: 2 },
      { id: 'p6', text: nfdBody, fontName: 'Times New Roman', fontSize: 13, alignment: 'Justified', firstLineIndentMm: 10, lineSpacingMultiple: 1.2, spaceBefore: 2, spaceAfter: 2 },
      { id: 'p7', text: nfdSignerRole, fontName: 'Times New Roman', fontSize: 13, bold: true, alignment: 'Centered', spaceBefore: 0, spaceAfter: 0 },
      { id: 'p8', text: nfdSignerName, fontName: 'Times New Roman', fontSize: 13, bold: true, alignment: 'Centered', spaceBefore: 0, spaceAfter: 0 },
      { id: 'p9', text: nfdRecipients, fontName: 'Times New Roman', fontSize: 12, italic: true, alignment: 'Left', spaceBefore: 0, spaceAfter: 0 },
    ];

    const summary = evaluateDocumentRules({
      profileId: 'NĐ30_TVCI',
      validationScope: 'document',
      paragraphSnapshots: nfdDoc,
      pageSnapshot: standardPage,
    });

    expect(summary.isBlankDocument).toBe(false);
    expect(summary.healthScore).toBeGreaterThanOrEqual(90);

    const missingComponents = summary.issues
      .filter((i) => i.status === 'MISSING')
      .map((i) => i.ruleId);

    expect(missingComponents).not.toContain('component.NATIONAL_EMBLEM.missing');
    expect(missingComponents).not.toContain('component.MOTTO.missing');
    expect(missingComponents).not.toContain('component.DOCUMENT_TYPE.missing');
    expect(missingComponents).not.toContain('component.PLACE_DATE.missing');
    expect(missingComponents).not.toContain('signer.role.missing');
    expect(missingComponents).not.toContain('component.RECIPIENTS.missing');
  });

  it('classifies Title Case signer role and prevents dumping into body paragraphs', () => {
    const paragraphs = [
      'TRUNG TÂM THỬ NGHIỆM - KIỂM ĐỊNH CÔNG NGHIỆP',
      'CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM',
      'Độc lập - Tự do - Hạnh phúc',
      'Số: 12/QĐ-TTTN',
      'Hà Nội, ngày 29 tháng 9 năm 2026',
      'QUYẾT ĐỊNH',
      'Về việc ban hành nội quy làm việc',
      'Căn cứ Nghị định số 30/2020/NĐ-CP ngày 05/3/2020 của Chính phủ;',
      'Ban hành kèm theo Quyết định này Quy chế làm việc của Trung tâm.',
      'Giám đốc',
      'Nguyễn Văn A',
      'Nơi nhận:\n- Như Điều 3;\n- Lưu: VT.',
    ];

    const components = classifyDocumentComponents(paragraphs, 'ADMINISTRATIVE');
    const signerRole = components.find((c) => c.type === 'SIGNER_ROLE');
    expect(signerRole).toBeDefined();
    expect(signerRole?.paragraphIndex).toBe(9);

    const snapshots: ParagraphSnapshot[] = paragraphs.map((text, index) => ({
      id: `p-${index}`,
      index,
      text,
      fontName: 'Times New Roman',
      fontSize: index === 5 ? 14 : index === 9 ? 13 : 13,
      bold: index === 1 || index === 2 || index === 5 || index === 9 || index === 10,
      alignment: index === 8 ? 'Justified' : index === 9 || index === 10 ? 'Centered' : 'Centered',
      firstLineIndentMm: index === 8 ? 10 : 0,
      lineSpacingMultiple: 1.2,
      spaceBefore: 0,
      spaceAfter: 0,
    }));

    const summary = evaluateDocumentRules(snapshots, 'NĐ30_TVCI');
    const signerResult = summary.results.find((r) => r.ruleId === 'signer.role');
    expect(signerResult?.status).not.toBe('MISSING');

    const uppercaseIssue = summary.issues.find((i) => i.ruleId === 'signer.role.uppercase');
    expect(uppercaseIssue).toBeDefined();
    expect(uppercaseIssue?.actual).toBe('Giám đốc');
    expect(uppercaseIssue?.expected).toBe('GIÁM ĐỐC');

    const bodyAlignResult = summary.results.find((r) => r.ruleId === 'body.alignment');
    expect(bodyAlignResult?.status).toBe('PASS');
    const bodyIndentResult = summary.results.find((r) => r.ruleId === 'body.firstLineIndent');
    expect(bodyIndentResult?.status).toBe('PASS');
  });

  it('correctly classifies legal basis with colon (Căn cứ: ...)', () => {
    const paragraphs = [
      'Căn cứ: Luật Doanh nghiệp số 59/2020/QH14 ngày 17 tháng 6 năm 2020;',
      'Căn cứ: Nghị định số 30/2020/NĐ-CP ngày 05 tháng 3 năm 2020 của Chính phủ;',
    ];

    const components = classifyDocumentComponents(paragraphs, 'ADMINISTRATIVE');
    expect(components.length).toBeGreaterThanOrEqual(1);
    expect(components[0].type).toBe('LEGAL_BASIS');
    expect(components[0].paragraphIndex).toBe(0);
  });

  it('classifies Title Case Agency Name in header zone (first 4 lines)', () => {
    const paragraphs = [
      'Trung tâm Thử nghiệm - Kiểm định Công nghiệp',
      'CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM',
      'Độc lập - Tự do - Hạnh phúc',
      'Số: 01/TB-TTTN',
    ];

    const components = classifyDocumentComponents(paragraphs, 'ADMINISTRATIVE');
    const agencyComp = components.find((c) => c.type === 'AGENCY_NAME');
    expect(agencyComp).toBeDefined();
    expect(agencyComp?.paragraphIndex).toBe(0);
  });
});
