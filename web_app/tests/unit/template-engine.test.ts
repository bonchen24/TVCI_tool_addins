import { describe, it, expect, vi } from 'vitest';
import {
  renderTemplateToTiptapDoc,
  renderTemplateToEditor,
  fillTemplateFieldsInDoc,
  applyTemplateFieldsToEditor,
  replacePlaceholdersInText,
  sanitizeMultilineInput,
} from '@/templates/engine';
import { getTemplateById } from '@/templates/catalog';
import type { JSONContent } from '@tiptap/core';

describe('Unit: 2-Tier Template Engine', () => {
  describe('Tier 1: Full Document AST Generation', () => {
    it('generates structured Tiptap JSONContent document root for Công văn', () => {
      const values = {
        SO_KY_HIEU: '102/TVCI-VP',
        place: 'Hà Nội',
        NGAY_BAN_HANH: '2026-09-29',
        TRICH_YEU: 'V/v thử nghiệm an toàn thiết bị mỏ',
        KINH_GUI: 'Các đơn vị thành viên',
        NOI_DUNG: 'Đoạn 1 công văn.\nĐoạn 2 công văn.',
        signerRole: 'GIÁM ĐỐC',
        NGUOI_KY: 'Nguyễn Văn An',
      };

      const doc = renderTemplateToTiptapDoc('tvci-cv', values);

      expect(doc.type).toBe('doc');
      expect(Array.isArray(doc.content)).toBe(true);
      expect(doc.content!.length).toBeGreaterThan(2);

      // Verify Header Table (admin-header, 40-60)
      const headerTable = doc.content![0];
      expect(headerTable.type).toBe('table');
      expect(headerTable.attrs?.tableType).toBe('admin-header');
      expect(headerTable.attrs?.columnRatio).toBe('40-60');
      expect(headerTable.attrs?.isBorderless).toBe(true);

      const headerRow = headerTable.content![0];
      const leftCell = headerRow.content![0];
      const rightCell = headerRow.content![1];

      expect(leftCell.attrs?.cellType).toBe('header-left');
      expect(leftCell.attrs?.colwidth).toEqual([250]);
      expect(JSON.stringify(leftCell)).toContain('102/TVCI-VP');

      expect(rightCell.attrs?.cellType).toBe('header-right');
      expect(rightCell.attrs?.colwidth).toEqual([374]);
      expect(JSON.stringify(rightCell)).toContain('CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM');
      expect(JSON.stringify(rightCell)).toContain('ngày 29 tháng 9 năm 2026');

      // Verify Footer Table (admin-footer, 50-50)
      const footerTable = doc.content![doc.content!.length - 1];
      expect(footerTable.type).toBe('table');
      expect(footerTable.attrs?.tableType).toBe('admin-footer');
      expect(footerTable.attrs?.columnRatio).toBe('50-50');
      expect(footerTable.attrs?.isBorderless).toBe(true);

      const footerRow = footerTable.content![0];
      const recipientsCell = footerRow.content![0];
      const signerCell = footerRow.content![1];

      expect(recipientsCell.attrs?.cellType).toBe('footer-recipients');
      expect(signerCell.attrs?.cellType).toBe('footer-signer');
      expect(JSON.stringify(signerCell)).toContain('GIÁM ĐỐC');
      expect(JSON.stringify(signerCell)).toContain('Nguyễn Văn An');
    });

    it('generates title and abstract for Quyết định template', () => {
      const values = {
        SO_KY_HIEU: '99/QĐ-TKV',
        TRICH_YEU: 'ban hành quy chế an toàn',
        CAN_CU: ['Căn cứ Luật Lao động 2019;', 'Xét đề nghị của Ban AT-TKV,'],
        QUYET_DINH_DIEU: ['Điều 1. Ban hành quy chế.', 'Điều 2. Hiệu lực thi hành.'],
      };

      const doc = renderTemplateToTiptapDoc('tkv-qd', values);
      const strDoc = JSON.stringify(doc);

      expect(strDoc).toContain('QUYẾT ĐỊNH');
      expect(strDoc).toContain('ban hành quy chế an toàn');
      expect(strDoc).toContain('Điều 1. Ban hành quy chế.');
      expect(strDoc).toContain('Điều 2. Hiệu lực thi hành.');
    });

    it('renderTemplateToEditor alias works identically', () => {
      const doc = renderTemplateToEditor('tvci-cv', { SO_KY_HIEU: '55/TVCI' });
      expect(doc.type).toBe('doc');
      expect(JSON.stringify(doc)).toContain('55/TVCI');
    });

    it('throws error when template ID is not found in system', () => {
      expect(() => renderTemplateToTiptapDoc('unknown_xyz')).toThrow(
        'Mẫu biểu không tồn tại trong hệ thống: unknown_xyz'
      );
    });
  });

  describe('Tier 2: In-Place Dynamic Field Fill & Node Walk', () => {
    it('updates header document number and date without altering custom body text', () => {
      // Build a base doc with user custom content
      const baseDoc: JSONContent = {
        type: 'doc',
        content: [
          {
            type: 'table',
            attrs: { tableType: 'admin-header' },
            content: [
              {
                type: 'tableRow',
                content: [
                  {
                    type: 'tableCell',
                    attrs: { cellType: 'header-left' },
                    content: [
                      {
                        type: 'paragraph',
                        content: [{ type: 'text', text: 'Số: 10/OLD-NUM' }],
                      },
                    ],
                  },
                  {
                    type: 'tableCell',
                    attrs: { cellType: 'header-right' },
                    content: [
                      {
                        type: 'paragraph',
                        content: [{ type: 'text', text: 'Hà Nội, ngày 01 tháng 01 năm 2026' }],
                      },
                    ],
                  },
                ],
              },
            ],
          },
          {
            type: 'paragraph',
            attrs: { textAlign: 'justify' },
            content: [{ type: 'text', text: 'Nội dung quan trọng do người dùng tự tay soạn thảo.' }],
          },
          {
            type: 'table',
            attrs: { tableType: 'admin-footer' },
            content: [
              {
                type: 'tableRow',
                content: [
                  {
                    type: 'tableCell',
                    attrs: { cellType: 'footer-recipients' },
                    content: [{ type: 'paragraph', content: [{ type: 'text', text: '- Như trên;' }] }],
                  },
                  {
                    type: 'tableCell',
                    attrs: { cellType: 'footer-signer' },
                    content: [
                      { type: 'paragraph', content: [{ type: 'text', text: 'PHÓ GIÁM ĐỐC' }] },
                      { type: 'paragraph', content: [{ type: 'text', text: ' ' }] },
                      { type: 'paragraph', content: [{ type: 'text', text: 'Trần Văn C' }] },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      };

      const newValues = {
        SO_KY_HIEU: '999/NEW-NUM',
        NGAY_BAN_HANH: '2026-09-29',
        signerRole: 'GIÁM ĐỐC TRUNG TÂM',
        NGUOI_KY: 'Lê Văn Mới',
      };

      const { doc: updatedDoc, report } = fillTemplateFieldsInDoc(baseDoc, newValues);

      // Verify header updated
      const updatedLeftCell = updatedDoc.content![0].content![0].content![0];
      expect(JSON.stringify(updatedLeftCell)).toContain('999/NEW-NUM');
      expect(JSON.stringify(updatedLeftCell)).not.toContain('10/OLD-NUM');

      // Verify date updated
      const updatedRightCell = updatedDoc.content![0].content![0].content![1];
      expect(JSON.stringify(updatedRightCell)).toContain('ngày 29 tháng 9 năm 2026');

      // Verify user's custom body paragraph PRESERVED intact
      const bodyPara = updatedDoc.content![1];
      expect(bodyPara.content![0].text).toBe('Nội dung quan trọng do người dùng tự tay soạn thảo.');

      // Verify signer updated
      const signerCell = updatedDoc.content![2].content![0].content![1];
      expect(JSON.stringify(signerCell)).toContain('GIÁM ĐỐC TRUNG TÂM');
      expect(JSON.stringify(signerCell)).toContain('Lê Văn Mới');

      expect(report.updatedFields).toContain('SO_KY_HIEU');
      expect(report.updatedFields).toContain('NGAY_BAN_HANH');
    });

    it('updates TRICH_YEU independently in header-left when SO_KY_HIEU is omitted', () => {
      const baseDoc: JSONContent = {
        type: 'doc',
        content: [
          {
            type: 'table',
            attrs: { tableType: 'admin-header' },
            content: [
              {
                type: 'tableRow',
                content: [
                  {
                    type: 'tableCell',
                    attrs: { cellType: 'header-left' },
                    content: [
                      {
                        type: 'paragraph',
                        content: [{ type: 'text', text: 'Số: 10/OLD-NUM' }],
                      },
                      {
                        type: 'paragraph',
                        content: [{ type: 'text', text: 'V/v nội dung cũ' }],
                      },
                    ],
                  },
                  {
                    type: 'tableCell',
                    attrs: { cellType: 'header-right' },
                    content: [
                      {
                        type: 'paragraph',
                        content: [{ type: 'text', text: 'Hà Nội, ngày 01 tháng 01 năm 2026' }],
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      };

      const { doc: updatedDoc, report } = fillTemplateFieldsInDoc(baseDoc, {
        TRICH_YEU: 'thử nghiệm an toàn thiết bị mỏ mới',
      });

      const leftCell = updatedDoc.content![0].content![0].content![0];
      // Doc number should remain unchanged
      expect(JSON.stringify(leftCell)).toContain('10/OLD-NUM');
      // Subject should be updated with V/v prefix and italic mark
      expect(JSON.stringify(leftCell)).toContain('V/v thử nghiệm an toàn thiết bị mỏ mới');
      expect(report.updatedFields).toContain('TRICH_YEU');
      expect(report.updatedFields).not.toContain('SO_KY_HIEU');
    });

    it('replaces regex fallback placeholders ({{TAG}} and [TAG]) inside text nodes', () => {
      const docWithPlaceholders: JSONContent = {
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [
              {
                type: 'text',
                text: 'Kính gửi: {{KINH_GUI}}, theo công văn số [SO_KY_HIEU] về việc [TRICH_YEU].',
              },
            ],
          },
        ],
      };

      const { doc: updatedDoc, report } = fillTemplateFieldsInDoc(docWithPlaceholders, {
        KINH_GUI: 'Ban Lãnh đạo Tập đoàn',
        SO_KY_HIEU: '102/TVCI',
        TRICH_YEU: 'kiểm định tời trục',
      });

      const textNode = updatedDoc.content![0].content![0];
      expect(textNode.text).toBe(
        'Kính gửi: Ban Lãnh đạo Tập đoàn, theo công văn số 102/TVCI về việc kiểm định tời trục.'
      );
      expect(report.replacedPlaceholders).toBe(1);
    });

    it('retains unfilled placeholders gracefully and records them in report', () => {
      const docWithLeftovers: JSONContent = {
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [
              {
                type: 'text',
                text: 'Văn bản số {{SO_KY_HIEU}}, chú thích: {{GHI_CHU_CHUA_CO}}.',
              },
            ],
          },
        ],
      };

      const { doc: updatedDoc, report } = fillTemplateFieldsInDoc(docWithLeftovers, {
        SO_KY_HIEU: '50/TVCI',
      });

      expect(updatedDoc.content![0].content![0].text).toBe(
        'Văn bản số 50/TVCI, chú thích: {{GHI_CHU_CHUA_CO}}.'
      );
      expect(report.unfilledPlaceholders).toContain('{{GHI_CHU_CHUA_CO}}');
    });

    it('applyTemplateFieldsToEditor dispatches content update on editor instance', () => {
      const setContentMock = vi.fn();
      const mockEditor = {
        getJSON: () => ({
          type: 'doc',
          content: [
            {
              type: 'paragraph',
              content: [{ type: 'text', text: 'Số: [SO_KY_HIEU]' }],
            },
          ],
        }),
        commands: {
          setContent: setContentMock,
        },
      };

      const report = applyTemplateFieldsToEditor(mockEditor, { SO_KY_HIEU: '77/TVCI' });
      expect(setContentMock).toHaveBeenCalledTimes(1);
      expect(setContentMock.mock.calls[0][1]).toEqual({ emitUpdate: false });
      expect(report.replacedPlaceholders).toBe(1);
    });
  });

  describe('Helper Utilities', () => {
    it('replacePlaceholdersInText handles both {{TAG}} and [TAG]', () => {
      const text = 'Số: {{SO_KY_HIEU}} - Ký: [NGUOI_KY]';
      const res = replacePlaceholdersInText(text, {
        SO_KY_HIEU: '123/TVCI',
        NGUOI_KY: 'Nguyễn Văn An',
      });
      expect(res).toBe('Số: 123/TVCI - Ký: Nguyễn Văn An');
    });

    it('sanitizeMultilineInput splits, trims, and filters empty lines', () => {
      const raw = 'Dòng 1\r\n\r\nDòng 2\n  \nDòng 3  ';
      const lines = sanitizeMultilineInput(raw);
      expect(lines).toEqual(['Dòng 1', 'Dòng 2', 'Dòng 3']);

      expect(sanitizeMultilineInput(null)).toEqual([]);
      expect(sanitizeMultilineInput(['  A  ', '', ' B '])).toEqual(['A', 'B']);
    });
  });
});
