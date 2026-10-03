/**
 * TVCI Administrative Template Engine
 * 2-tier injection:
 *   Tier 1: Full Document Tiptap AST Generation (Header 40-60, Body, Footer 50-50)
 *   Tier 2: In-place Dynamic Field Injection & Regex Fallback Replacement
 * Conforms to Nghị định 30/2020/NĐ-CP & Enterprise Profiles (TVCI, IEMM, TKV, DANG).
 */

import type { JSONContent } from '@tiptap/core';
import type {
  AdministrativeTemplate,
  DynamicFillReport,
  TemplateCategory,
  TemplateFormValue,
  TemplateFormValues,
} from './types';
import { getTemplateById } from './catalog';
import { getFormSchema } from './form-schema';
import { formatAdministrativeDate } from './form-validation';

function textValue(value: TemplateFormValue): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

function firstTextValue(values: TemplateFormValues, ...keys: string[]): string | undefined {
  for (const key of keys) {
    const value = textValue(values[key]);
    if (value) return value;
  }
  return undefined;
}

type TemplateEditor = {
  getJSON(): unknown;
  commands?: { setContent(content: JSONContent, options?: { emitUpdate?: boolean }): unknown };
};

function isJsonContent(value: unknown): value is JSONContent {
  return typeof value === 'object' && value !== null && 'type' in value && typeof value.type === 'string';
}

/**
 * Splits multi-line textarea input or string array into clean non-empty paragraph strings.
 */
export function sanitizeMultilineInput(input: string | string[] | undefined | null): string[] {
  if (!input) return [];
  if (Array.isArray(input)) {
    return input.map((s) => String(s).trim()).filter((s) => s.length > 0);
  }
  return String(input)
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

/**
 * Replaces both {{TAG}} and [TAG] placeholders with corresponding values.
 * Gracefully retains any unfilled placeholders without throwing or wiping them.
 */
export function replacePlaceholdersInText(text: string, values: TemplateFormValues): string {
  if (!text) return '';
  let result = text;

  for (const [key, val] of Object.entries(values)) {
    if (val === undefined || val === null) continue;
    const strVal = Array.isArray(val) ? val.join('\n') : String(val);
    const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    // Replace {{KEY}}
    result = result.replace(new RegExp(`\\{\\{${escapedKey}\\}\\}`, 'g'), strVal);

    // Replace [KEY]
    result = result.replace(new RegExp(`\\[${escapedKey}\\]`, 'g'), strVal);
  }

  return result;
}

// ----------------------------------------------------------------------------
// Helper Builders for Tiptap Administrative AST Nodes
// ----------------------------------------------------------------------------

function makeParagraph(
  text: string,
  attrs: {
    textAlign?: 'left' | 'center' | 'right' | 'justify';
    fontSize?: number;
    bold?: boolean;
    italic?: boolean;
    lineSpacing?: number;
    firstLineIndentMm?: number;
    spaceBefore?: number;
    spaceAfter?: number;
  } = {}
): JSONContent {
  const contentNode: JSONContent = { type: 'text', text };

  if (attrs.bold || attrs.italic) {
    contentNode.marks = [];
    if (attrs.bold) contentNode.marks.push({ type: 'bold' });
    if (attrs.italic) contentNode.marks.push({ type: 'italic' });
  }

  return {
    type: 'paragraph',
    attrs: {
      textAlign: attrs.textAlign || 'left',
      fontFamily: 'Times New Roman',
      fontSize: attrs.fontSize || 13,
      lineSpacing: attrs.lineSpacing || 1.2,
      spaceBefore: attrs.spaceBefore ?? 0,
      spaceAfter: attrs.spaceAfter ?? 0,
      firstLineIndentMm: attrs.firstLineIndentMm ?? 0,
    },
    content: text.length > 0 ? [contentNode] : [],
  };
}

function makeAdminRule(kind: 'AGENCY' | 'MOTTO' | 'ABSTRACT', widthPercent: number): JSONContent {
  return {
    type: 'adminRule',
    attrs: {
      kind,
      widthPercent,
    },
  };
}

function buildHeaderTable(
  template: AdministrativeTemplate,
  values: TemplateFormValues,
  dateStr: string,
  docNumber: string
): JSONContent {
  const agencyUpper =
    firstTextValue(values, 'parentAgencyName', 'CO_QUAN_CHU_QUAN') ||
    template.headerSetup.agencyUpper;

  const agencyLower =
    firstTextValue(values, 'agencyName', 'CO_QUAN_BAN_HANH') ||
    template.headerSetup.agencyLower;

  const agencyDept =
    firstTextValue(values, 'agencyDepartment') ||
    template.headerSetup.agencyDepartment;

  const leftCellContent: JSONContent[] = [];

  if (agencyUpper) {
    leftCellContent.push(
      makeParagraph(agencyUpper, {
        textAlign: 'center',
        fontSize: 12,
        lineSpacing: 1.15,
        spaceBefore: 0,
        spaceAfter: 0,
      })
    );
  }

  leftCellContent.push(
    makeParagraph(agencyLower, {
      textAlign: 'center',
      fontSize: 12,
      bold: true,
      lineSpacing: 1.15,
      spaceBefore: 2,
      spaceAfter: 0,
    })
  );

  if (agencyDept) {
    leftCellContent.push(
      makeParagraph(agencyDept, {
        textAlign: 'center',
        fontSize: 11,
        bold: true,
        lineSpacing: 1.15,
        spaceBefore: 2,
        spaceAfter: 0,
      })
    );
  }

  leftCellContent.push(makeAdminRule('AGENCY', 40));

  // Document Number
  leftCellContent.push(
    makeParagraph(`Số: ${docNumber}`, {
      textAlign: 'center',
      fontSize: 13,
      lineSpacing: 1.2,
      spaceBefore: 4,
      spaceAfter: 0,
    })
  );

  // If this is a Công văn, trích yếu is placed right below the document number in the left header cell
  if (template.category === 'cong_van' || template.schemaId === 'cong_van') {
    const subject = firstTextValue(values, 'TRICH_YEU', 'subject') || 'V/v công tác chuyên môn';
    const displaySubject = subject.startsWith('V/v') ? subject : `V/v ${subject}`;
    leftCellContent.push(
      makeParagraph(displaySubject, {
        textAlign: 'center',
        fontSize: 12,
        italic: true,
        lineSpacing: 1.2,
        spaceBefore: 2,
        spaceAfter: 0,
      })
    );
  }

  // Right Header Cell: Motto & Date
  const rightCellContent: JSONContent[] = [
    makeParagraph(template.headerSetup.mottoUpper || 'CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM', {
      textAlign: 'center',
      fontSize: 12,
      bold: true,
      lineSpacing: 1.15,
      spaceBefore: 0,
      spaceAfter: 0,
    }),
    makeParagraph(template.headerSetup.mottoLower || 'Độc lập - Tự do - Hạnh phúc', {
      textAlign: 'center',
      fontSize: 13,
      bold: true,
      lineSpacing: 1.15,
      spaceBefore: 2,
      spaceAfter: 0,
    }),
    makeAdminRule('MOTTO', 95),
    makeParagraph(dateStr, {
      textAlign: 'center',
      fontSize: 13,
      italic: true,
      lineSpacing: 1.2,
      spaceBefore: 4,
      spaceAfter: 0,
    }),
  ];

  return {
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
            content: leftCellContent,
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
            content: rightCellContent,
          },
        ],
      },
    ],
  };
}

function buildFooterTable(
  template: AdministrativeTemplate,
  values: TemplateFormValues
): JSONContent {
  const recipientsList = sanitizeMultilineInput(
    values.NOI_NHAN || values.recipients || template.footerSetup.defaultRecipients
  );

  const leftCellContent: JSONContent[] = [
    makeParagraph(template.footerSetup.recipientsTitle || 'Nơi nhận:', {
      textAlign: 'left',
      fontSize: 12,
      bold: true,
      italic: true,
      lineSpacing: 1.15,
      spaceBefore: 0,
      spaceAfter: 2,
    }),
  ];

  for (const item of recipientsList) {
    const formattedItem = item.startsWith('-') ? item : `- ${item};`;
    leftCellContent.push(
      makeParagraph(formattedItem, {
        textAlign: 'left',
        fontSize: 11,
        lineSpacing: 1.15,
        spaceBefore: 1,
        spaceAfter: 1,
      })
    );
  }

  const signerRole =
    firstTextValue(values, 'signerRole', 'CHUC_VU') ||
    template.footerSetup.signerPosition ||
    'GIÁM ĐỐC';

  const signerName =
    firstTextValue(values, 'NGUOI_KY', 'signerName') ||
    template.footerSetup.signerName ||
    'Nguyễn Văn An';

  const rightCellContent: JSONContent[] = [];

  const roleLines = signerRole.split(/\r?\n/).map((l: string) => l.trim()).filter(Boolean);
  for (let i = 0; i < roleLines.length; i++) {
    rightCellContent.push(
      makeParagraph(roleLines[i], {
        textAlign: 'center',
        fontSize: 13,
        bold: true,
        lineSpacing: 1.15,
        spaceBefore: i === 0 ? 0 : 2,
        spaceAfter: 0,
      })
    );
  }

  // 3 empty paragraphs for signature spacing
  for (let i = 0; i < 3; i++) {
    rightCellContent.push(
      makeParagraph(' ', {
        textAlign: 'center',
        fontSize: 13,
        lineSpacing: 1.0,
        spaceBefore: 0,
        spaceAfter: 0,
      })
    );
  }

  // Signer Name
  rightCellContent.push(
    makeParagraph(signerName, {
      textAlign: 'center',
      fontSize: 13,
      bold: true,
      lineSpacing: 1.15,
      spaceBefore: 0,
      spaceAfter: 0,
    })
  );

  return {
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
            content: leftCellContent,
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
            content: rightCellContent,
          },
        ],
      },
    ],
  };
}

// ----------------------------------------------------------------------------
// Tier 1: Render Template to Tiptap AST Document
// ----------------------------------------------------------------------------

export function renderTemplateToTiptapDoc(
  templateOrId: AdministrativeTemplate | string,
  values: TemplateFormValues = {}
): JSONContent {
  let template: AdministrativeTemplate | undefined;

  if (typeof templateOrId === 'string') {
    template = getTemplateById(templateOrId);
    if (!template) {
      const schema = getFormSchema(templateOrId);
      if (schema) {
        template = {
          id: schema.id,
          name: schema.name,
          title: schema.name,
          category: (schema.category === 'dang' ? 'cong_van' : schema.category === 'noi_bo' ? 'bieu_mau_noi_bo' : schema.id as TemplateCategory) || 'cong_van',
          vietnameseCategory: schema.name,
          organization: 'TVCI',
          fileName: `${schema.id}-template.docx`,
          description: schema.description || schema.name,
          schemaId: schema.id,
          defaultProfile: schema.defaultProfile,
          keywords: [schema.name],
          headerSetup: {
            agencyUpper: 'VIỆN CƠ KHÍ NĂNG LƯỢNG VÀ MỎ - VINACOMIN',
            agencyLower: 'TRUNG TÂM THỬ NGHIỆM - KIỂM ĐỊNH CÔNG NGHIỆP',
            documentSymbolPrefix: 'Số: …/TVCI',
            mottoUpper: 'CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM',
            mottoLower: 'Độc lập - Tự do - Hạnh phúc',
            defaultLocation: 'Hà Nội',
          },
          footerSetup: {
            recipientsTitle: 'Nơi nhận:',
            defaultRecipients: ['- Như trên;', '- Lưu: VT, VP.'],
            signerPosition: 'GIÁM ĐỐC',
            signerName: 'Nguyễn Văn An',
          },
          initialBodyParagraphs: [],
          version: '1.0.0',
          status: 'active',
          verification: {
            status: 'verified',
            reason: 'Synthesized from form schema',
            canonicalSource: null,
            runtime: { path: `${schema.id}-template.docx`, sha256: null },
          },
        };
      } else {
        throw new Error(`Mẫu biểu không tồn tại trong hệ thống: ${templateOrId}`);
      }
    }
  } else {
    template = templateOrId;
  }

  if (!template) {
    throw new Error(`Mẫu biểu không hợp lệ.`);
  }

  const place = firstTextValue(values, 'place', 'diaDanh') || template.headerSetup.defaultLocation || 'Hà Nội';
  const rawDate = firstTextValue(values, 'NGAY_BAN_HANH', 'date') || new Date();
  const dateStr = firstTextValue(values, 'dateStr') || formatAdministrativeDate(place, rawDate);

  const docNumber =
    firstTextValue(values, 'SO_KY_HIEU', 'documentNumber', 'contractNumber') ||
    template.headerSetup.documentSymbolPrefix.replace('Số: ', '') ||
    '102/TVCI-VP';

  const docContent: JSONContent[] = [];

  // 1. Administrative 2-Column Header Table
  docContent.push(buildHeaderTable(template, values, dateStr, docNumber));

  // 2. Document Title & Abstract Block (for types other than Công văn)
  if (template.category !== 'cong_van' && template.schemaId !== 'cong_van') {
    let titleName = template.vietnameseCategory.toUpperCase();
    if (template.schemaId === 'quyet_dinh') titleName = 'QUYẾT ĐỊNH';
    else if (template.schemaId === 'thong_bao') titleName = 'THÔNG BÁO';
    else if (template.schemaId === 'to_trinh') titleName = 'TỜ TRÌNH';
    else if (template.schemaId === 'bao_cao') titleName = 'BÁO CÁO';
    else if (template.schemaId === 'bien_ban') titleName = 'BIÊN BẢN';
    else if (template.schemaId === 'ke_hoach') titleName = 'KẾ HOẠCH';
    else if (template.schemaId === 'hop_dong') titleName = 'HỢP ĐỒNG KINH TẾ';
    else if (template.schemaId === 'thu_moi') titleName = 'GIẤY MỜI';
    else if (template.schemaId === 'don_nghi_phep') titleName = 'ĐƠN XIN NGHỈ PHÉP';

    docContent.push(
      makeParagraph(titleName, {
        textAlign: 'center',
        fontSize: 14,
        bold: true,
        lineSpacing: 1.2,
        spaceBefore: 12,
        spaceAfter: 2,
      })
    );

    const subject = firstTextValue(values, 'TRICH_YEU', 'subject', 'meetingTitle');
    if (subject) {
      const subjectText = subject.startsWith('V/v') || subject.startsWith('Về việc')
        ? subject
        : `Về việc ${subject}`;

      docContent.push(
        makeParagraph(subjectText, {
          textAlign: 'center',
          fontSize: 13,
          bold: true,
          lineSpacing: 1.2,
          spaceBefore: 2,
          spaceAfter: 4,
        })
      );
      docContent.push(makeAdminRule('ABSTRACT', 35));
    }
  }

  // 3. Body Sections
  if (firstTextValue(values, 'KINH_GUI', 'directRecipients')) {
    const addresseeText = firstTextValue(values, 'KINH_GUI', 'directRecipients')!;
    docContent.push({
      type: 'paragraph',
      attrs: {
        textAlign: 'left',
        fontFamily: 'Times New Roman',
        fontSize: 13,
        lineSpacing: 1.3,
        spaceBefore: 12,
        spaceAfter: 4,
        firstLineIndentMm: 0,
      },
      content: [
        { type: 'text', marks: [{ type: 'bold' }], text: 'Kính gửi: ' },
        { type: 'text', text: addresseeText },
      ],
    });
  }

  // Schema-specific body sections
  if (template.schemaId === 'quyet_dinh') {
    const legalBases = sanitizeMultilineInput(values.CAN_CU || values.legalBases);
    for (const base of legalBases) {
      docContent.push(
        makeParagraph(base, {
          textAlign: 'justify',
          fontSize: 13,
          italic: true,
          lineSpacing: 1.2,
          firstLineIndentMm: 12.7,
          spaceBefore: 2,
          spaceAfter: 2,
        })
      );
    }

    docContent.push(
      makeParagraph('QUYẾT ĐỊNH:', {
        textAlign: 'center',
        fontSize: 13,
        bold: true,
        lineSpacing: 1.2,
        spaceBefore: 6,
        spaceAfter: 6,
      })
    );

    const clauses = sanitizeMultilineInput(values.QUYET_DINH_DIEU || values.decisionClauses);
    for (const clause of clauses) {
      docContent.push(
        makeParagraph(clause, {
          textAlign: 'justify',
          fontSize: 13,
          lineSpacing: 1.2,
          firstLineIndentMm: 12.7,
          spaceBefore: 2,
          spaceAfter: 4,
        })
      );
    }
  } else if (values.NOI_DUNG || values.body) {
    const bodyParagraphs = sanitizeMultilineInput(values.NOI_DUNG || values.body);
    for (const para of bodyParagraphs) {
      const renderedPara = replacePlaceholdersInText(para, values);
      docContent.push(
        makeParagraph(renderedPara, {
          textAlign: 'justify',
          fontSize: 13,
          lineSpacing: 1.2,
          firstLineIndentMm: 12.7,
          spaceBefore: 2,
          spaceAfter: 2,
        })
      );
    }
  } else if (template.initialBodyParagraphs && template.initialBodyParagraphs.length > 0) {
    for (const para of template.initialBodyParagraphs) {
      const renderedPara = replacePlaceholdersInText(para, values);
      docContent.push(
        makeParagraph(renderedPara, {
          textAlign: 'justify',
          fontSize: 13,
          lineSpacing: 1.2,
          firstLineIndentMm: 12.7,
          spaceBefore: 2,
          spaceAfter: 2,
        })
      );
    }
  } else {
    docContent.push(
      makeParagraph('Nội dung văn bản chi tiết đang được soạn thảo...', {
        textAlign: 'justify',
        fontSize: 13,
        lineSpacing: 1.2,
        firstLineIndentMm: 12.7,
        spaceBefore: 4,
        spaceAfter: 4,
      })
    );
  }

  // 4. Administrative 2-Column Footer Table
  docContent.push(buildFooterTable(template, values));

  return {
    type: 'doc',
    content: docContent,
  };
}

/** Compatibility alias for PROJECT.md interface contract */
export const renderTemplateToEditor = renderTemplateToTiptapDoc;

// ----------------------------------------------------------------------------
// Tier 2: Dynamic Field Injection & Node Walk
// ----------------------------------------------------------------------------

/**
 * Deep clones and walks Tiptap document AST to inject updated field values
 * without modifying or overwriting custom body paragraphs written by the user.
 */
export function fillTemplateFieldsInDoc(
  doc: JSONContent,
  values: TemplateFormValues
): { doc: JSONContent; report: DynamicFillReport } {
  const clonedDoc: JSONContent = JSON.parse(JSON.stringify(doc));
  const updatedFields: string[] = [];
  let replacedPlaceholders = 0;
  const unfilledPlaceholders: string[] = [];

  const place = firstTextValue(values, 'place', 'diaDanh') || 'Hà Nội';
  const rawDate = firstTextValue(values, 'NGAY_BAN_HANH', 'date');
  const newDateStr = rawDate ? formatAdministrativeDate(place, rawDate) : null;
  const newDocNumber = firstTextValue(values, 'SO_KY_HIEU', 'documentNumber') || null;
  const newSubject = firstTextValue(values, 'TRICH_YEU', 'subject') || null;
  const newSigner = firstTextValue(values, 'NGUOI_KY', 'signerName') || null;
  const newRole = firstTextValue(values, 'signerRole', 'CHUC_VU') || null;
  const newRecipients = values.NOI_NHAN || values.recipients || null;

  function walk(node: JSONContent) {
    if (!node) return;

    // Check table cells by type
    if (node.type === 'tableCell' && node.attrs?.cellType) {
      const cellType = node.attrs.cellType;

      if (cellType === 'header-left') {
        if (node.content && (newDocNumber || newSubject)) {
          for (const p of node.content) {
            if (newDocNumber && p.content && p.content.some((t) => t.text?.includes('Số:'))) {
              p.content = [{ type: 'text', text: `Số: ${newDocNumber}` }];
              updatedFields.push('SO_KY_HIEU');
            } else if (newSubject && p.content && p.content.some((t) => t.text?.startsWith('V/v'))) {
              const displaySubject = newSubject.startsWith('V/v') ? newSubject : `V/v ${newSubject}`;
              p.content = [{ type: 'text', marks: [{ type: 'italic' }], text: displaySubject }];
              updatedFields.push('TRICH_YEU');
            }
          }
        }
      } else if (cellType === 'header-right') {
        if (newDateStr && node.content) {
          for (const p of node.content) {
            if (p.content && p.content.some((t) => t.text && /ngày\s+\d+\s+tháng/iu.test(t.text))) {
              p.content = [{ type: 'text', marks: [{ type: 'italic' }], text: newDateStr }];
              updatedFields.push('NGAY_BAN_HANH');
            }
          }
        }
      } else if (cellType === 'footer-signer') {
        if (node.content && node.content.length > 0) {
          if (newRole) {
            node.content[0] = makeParagraph(newRole, {
              textAlign: 'center',
              fontSize: 13,
              bold: true,
              lineSpacing: 1.15,
            });
            updatedFields.push('signerRole');
          }
          if (newSigner) {
            const lastIdx = node.content.length - 1;
            node.content[lastIdx] = makeParagraph(newSigner, {
              textAlign: 'center',
              fontSize: 13,
              bold: true,
              lineSpacing: 1.15,
            });
            updatedFields.push('NGUOI_KY');
          }
        }
      } else if (cellType === 'footer-recipients') {
        if (newRecipients && node.content) {
          const lines = sanitizeMultilineInput(newRecipients);
          if (lines.length > 0) {
            const newContent: JSONContent[] = [
              makeParagraph('Nơi nhận:', {
                textAlign: 'left',
                fontSize: 12,
                bold: true,
                italic: true,
                lineSpacing: 1.15,
              }),
            ];
            for (const line of lines) {
              const item = line.startsWith('-') ? line : `- ${line};`;
              newContent.push(
                makeParagraph(item, {
                  textAlign: 'left',
                  fontSize: 11,
                  lineSpacing: 1.15,
                })
              );
            }
            node.content = newContent;
            updatedFields.push('NOI_NHAN');
          }
        }
      }
    }

    // Replace text node placeholders (Tier 2 regex fallback)
    if (node.type === 'text' && node.text) {
      const originalText = node.text;
      const replacedText = replacePlaceholdersInText(originalText, values);

      if (replacedText !== originalText) {
        node.text = replacedText;
        replacedPlaceholders++;
      }

      // Check for any remaining unfilled placeholders
      const leftoverTags = node.text.match(/\{\{([A-Z0-9_]+)\}\}|\[([A-Z0-9_]+)\]/g);
      if (leftoverTags) {
        for (const t of leftoverTags) {
          if (!unfilledPlaceholders.includes(t)) {
            unfilledPlaceholders.push(t);
          }
        }
      }
    }

    if (node.content && Array.isArray(node.content)) {
      for (const child of node.content) {
        walk(child);
      }
    }
  }

  walk(clonedDoc);

  return {
    doc: clonedDoc,
    report: {
      updatedFields: Array.from(new Set(updatedFields)),
      replacedPlaceholders,
      unfilledPlaceholders,
    },
  };
}

/**
 * Apply template fields to active editor instance without losing existing body edits.
 */
export function applyTemplateFieldsToEditor(
  editor: TemplateEditor | null | undefined,
  values: TemplateFormValues
): DynamicFillReport {
  if (!editor) {
    return { updatedFields: [], replacedPlaceholders: 0, unfilledPlaceholders: [] };
  }

  const currentDoc = editor.getJSON();
  if (!isJsonContent(currentDoc)) {
    return { updatedFields: [], replacedPlaceholders: 0, unfilledPlaceholders: [] };
  }
  const { doc: updatedDoc, report } = fillTemplateFieldsInDoc(currentDoc, values);

  if (typeof editor.commands?.setContent === 'function') {
    editor.commands.setContent(updatedDoc, { emitUpdate: false });
  }

  return report;
}
