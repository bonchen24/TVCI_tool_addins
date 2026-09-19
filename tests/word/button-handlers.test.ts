import { autoFitTableToWindow, cleanBlankPagesSafe } from '../../src/word/page-toolkit.service';
import { applyInversePatches, selectParagraphByTargetId } from '../../src/word/formatting.service';
import type { ParagraphSnapshot } from '../../src/rules/models';

describe('Button Handlers & Toolkit Services', () => {
  let activeContext: any;
  let previousWord: any;

  beforeEach(() => {
    activeContext = {
      document: {
        body: {
          paragraphs: {
            items: [],
            load: jest.fn(),
          },
          tables: {
            items: [],
            load: jest.fn(),
          },
        },
        getSelection: jest.fn(),
      },
      sync: jest.fn().mockResolvedValue(undefined),
    };

    previousWord = (globalThis as any).Word;
    (globalThis as any).Word = {
      run: jest.fn(async (cb) => cb(activeContext)),
      Alignment: {
        left: 'Left',
        centered: 'Centered',
        right: 'Right',
        justified: 'Justified',
      },
      UnderlineType: {
        none: 'None',
        single: 'Single',
      },
    };
  });

  afterEach(() => {
    (globalThis as any).Word = previousWord;
  });

  describe('autoFitTableToWindow', () => {
    it('uses selection table when directly selected', async () => {
      const tableMock = {
        autoFitWindow: jest.fn(),
        load: jest.fn(),
        isNullObject: false,
      };
      activeContext.document.getSelection.mockReturnValue({
        tables: {
          getFirstOrNullObject: jest.fn().mockReturnValue(tableMock),
        },
      });

      const result = await autoFitTableToWindow();
      expect(result).toBe(true);
      expect(tableMock.autoFitWindow).toHaveBeenCalled();
    });

    it('falls back to parentTableOrNullObject when cursor is inside a cell', async () => {
      const emptyTable = {
        load: jest.fn(),
        isNullObject: true,
      };
      const parentTable = {
        autoFitWindow: jest.fn(),
        load: jest.fn(),
        isNullObject: false,
      };
      activeContext.document.getSelection.mockReturnValue({
        tables: {
          getFirstOrNullObject: jest.fn().mockReturnValue(emptyTable),
        },
        parentTableOrNullObject: parentTable,
      });

      const result = await autoFitTableToWindow();
      expect(result).toBe(true);
      expect(parentTable.autoFitWindow).toHaveBeenCalled();
    });

    it('returns false when no table is selected or found', async () => {
      const emptyTable = {
        load: jest.fn(),
        isNullObject: true,
      };
      activeContext.document.getSelection.mockReturnValue({
        tables: {
          getFirstOrNullObject: jest.fn().mockReturnValue(emptyTable),
        },
        parentTableOrNullObject: emptyTable,
      });
      activeContext.document.body.tables.items = [];

      const result = await autoFitTableToWindow();
      expect(result).toBe(false);
    });
  });

  describe('cleanBlankPagesSafe', () => {
    it('never deletes the only remaining paragraph in a blank document', async () => {
      const singleParagraph = {
        text: '   ',
        load: jest.fn(),
        delete: jest.fn(),
      };
      activeContext.document.body.paragraphs.items = [singleParagraph];

      const deleted = await cleanBlankPagesSafe();
      expect(deleted).toBe(0);
      expect(singleParagraph.delete).not.toHaveBeenCalled();
    });

    it('safely deletes trailing empty paragraphs when multiple paragraphs exist', async () => {
      const contentParagraph = {
        text: 'Nội dung văn bản chính',
        load: jest.fn(),
        delete: jest.fn(),
      };
      const trailingBlank1 = {
        text: '',
        load: jest.fn(),
        delete: jest.fn(),
      };
      const trailingBlank2 = {
        text: '   ',
        load: jest.fn(),
        delete: jest.fn(),
      };
      activeContext.document.body.paragraphs.items = [contentParagraph, trailingBlank1, trailingBlank2];

      const deleted = await cleanBlankPagesSafe();
      expect(deleted).toBe(2);
      expect(trailingBlank1.delete).toHaveBeenCalled();
      expect(trailingBlank2.delete).toHaveBeenCalled();
      expect(contentParagraph.delete).not.toHaveBeenCalled();
    });
  });

  describe('selectParagraphByTargetId', () => {
    it('returns false gracefully when target is page, missing, or horizontal', async () => {
      expect(await selectParagraphByTargetId('page')).toBe(false);
      expect(await selectParagraphByTargetId('missing:national_emblem')).toBe(false);
      expect(await selectParagraphByTargetId('horizontal:TITLE_ABSTRACT')).toBe(false);
      expect(await selectParagraphByTargetId('')).toBe(false);
    });

    it('selects the paragraph when targetId is valid doc:p:X', async () => {
      const p0 = { select: jest.fn() };
      const p1 = { select: jest.fn() };
      activeContext.document.body.paragraphs.items = [p0, p1];

      const result = await selectParagraphByTargetId('doc:p:1');
      expect(result).toBe(true);
      expect(p1.select).toHaveBeenCalled();
      expect(p0.select).not.toHaveBeenCalled();
    });
  });

  describe('applyInversePatches (Rollback)', () => {
    it('restores previous paragraph formatting from snapshot', async () => {
      const p0 = {
        font: { name: 'Arial', size: 10, bold: false, italic: false, underline: 'None' },
        alignment: 'Left',
        spaceBefore: 0,
        spaceAfter: 0,
        firstLineIndent: 0,
        lineSpacing: 12,
      };
      activeContext.document.body.paragraphs.items = [p0];

      const snapshot: ParagraphSnapshot = {
        id: 'doc:p:0',
        text: 'Đoạn văn',
        fontName: 'Times New Roman',
        fontSize: 13,
        bold: true,
        italic: true,
        underline: false,
        alignment: 'Justified',
        spaceBefore: 2,
        spaceAfter: 2,
        firstLineIndentMm: 10,
        lineSpacingPt: 15.6,
      };

      const restoredCount = await applyInversePatches([snapshot]);
      expect(restoredCount).toBe(1);
      expect(p0.font.name).toBe('Times New Roman');
      expect(p0.font.size).toBe(13);
      expect(p0.font.bold).toBe(true);
      expect(p0.font.italic).toBe(true);
      expect(p0.alignment).toBe('Justified');
      expect(p0.spaceBefore).toBe(2);
      expect(p0.spaceAfter).toBe(2);
    });
  });
});
