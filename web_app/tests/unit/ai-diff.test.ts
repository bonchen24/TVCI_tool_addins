import { describe, it, expect, vi } from 'vitest';
import {
  calculateWordDiff,
  generateAiDiff,
  resolveAcceptedDiff,
  applyAiDiffToSelection,
  getEditorSelectedText,
  getEditorFullText,
  DIFF_THEME,
} from '@/ai/diff';

describe('Visual Diff Preview Workflow (F22)', () => {
  it('should calculate diff spans with added and removed flags', () => {
    const original = 'Hội đồng quản trị';
    const updated = 'Hội đồng thành viên';

    const diff = calculateWordDiff(original, updated);
    expect(diff.length).toBeGreaterThan(1);
    expect(diff.some((d) => d.removed)).toBe(true);
    expect(diff.some((d) => d.added)).toBe(true);
  });

  it('should format additions with Emerald color token (#10B981) and deletions with Rose (#EF4444)', () => {
    expect(DIFF_THEME.addedToken).toBe('#10B981');
    expect(DIFF_THEME.addedBg).toBe('#D1FAE5');
    expect(DIFF_THEME.removedToken).toBe('#EF4444');
    expect(DIFF_THEME.removedBg).toBe('#FEE2E2');
  });

  it('should return single unchanged span when original and updated text are identical', () => {
    const text = 'Văn bản không có thay đổi nào.';
    const diff = calculateWordDiff(text, text);

    expect(diff.length).toBe(1);
    expect(diff[0].value).toBe(text);
    expect(diff[0].added).toBeUndefined();
    expect(diff[0].removed).toBeUndefined();
  });

  it('should replace document selection with updated text upon Accept', () => {
    const original = 'Đoạn văn cũ có lỗi chính tả.';
    const updated = 'Đoạn văn mới đã được trau chuốt chuẩn xác.';

    const diffResult = generateAiDiff(original, updated);
    const resolved = resolveAcceptedDiff(diffResult, { 'group-1': 'accept' });

    expect(resolved).toBe(updated);
  });

  it('should preserve original document text untouched upon Reject', () => {
    const original = 'Văn bản gốc giữ nguyên vẹn.';
    const updated = 'Gợi ý bị từ chối hoàn toàn.';

    const diffResult = generateAiDiff(original, updated);
    const resolved = resolveAcceptedDiff(diffResult, { 'group-1': 'reject' });

    expect(resolved).toBe(original);
  });

  it('should support granular mixed decisions across multiple change groups', () => {
    const original = 'Chào bạn, chúc bạn một ngày tốt lành và vui vẻ.';
    const updated = 'Kính gửi Quý đơn vị, chúc bạn một ngày hiệu quả và vui vẻ.';

    const diffResult = generateAiDiff(original, updated);
    expect(diffResult.groups.length).toBeGreaterThanOrEqual(2);

    // Accept first change group, reject second
    const decisions: Record<string, 'accept' | 'reject'> = {
      'group-1': 'accept',
      'group-2': 'reject',
    };

    const resolved = resolveAcceptedDiff(diffResult, decisions);
    expect(resolved).toContain('Kính gửi Quý đơn vị');
    expect(resolved).toContain('tốt lành'); // rejected group kept original
  });

  it('should integrate with editor instance to replace selection', () => {
    const mockInsertContent = vi.fn().mockReturnThis();
    const mockDeleteRange = vi.fn().mockReturnThis();
    const mockFocus = vi.fn().mockReturnValue({
      deleteRange: mockDeleteRange,
      insertContent: mockInsertContent,
      run: vi.fn(),
    });

    const mockEditor = {
      state: {
        selection: { from: 10, to: 30 },
        doc: {
          textBetween: vi.fn().mockReturnValue('Đoạn văn được chọn'),
          content: { size: 100 },
        },
      },
      chain: vi.fn().mockReturnValue({
        focus: mockFocus,
      }),
    };

    expect(getEditorSelectedText(mockEditor)).toBe('Đoạn văn được chọn');
    applyAiDiffToSelection(mockEditor, 'Văn bản mới thay thế');
    expect(mockEditor.chain).toHaveBeenCalled();
  });

  it('should read full document text when no selection exists', () => {
    const mockEditor = {
      state: {
        selection: { from: 5, to: 5 },
        doc: {
          textBetween: vi.fn().mockImplementation((from, to) => {
            if (from === 0) return 'Toàn bộ nội dung văn bản';
            return '';
          }),
          content: { size: 50 },
        },
      },
    };

    expect(getEditorSelectedText(mockEditor)).toBe('');
    expect(getEditorFullText(mockEditor)).toBe('Toàn bộ nội dung văn bản');
  });

  it('should replace entire document when selection is collapsed to prevent duplication', () => {
    const mockInsertContent = vi.fn().mockReturnThis();
    const mockDeleteRange = vi.fn().mockReturnThis();
    const mockFocus = vi.fn().mockReturnValue({
      deleteRange: mockDeleteRange,
      insertContent: mockInsertContent,
      run: vi.fn(),
    });

    const mockEditor = {
      state: {
        selection: { from: 10, to: 10 },
        doc: {
          content: { size: 150 },
        },
      },
      chain: vi.fn().mockReturnValue({
        focus: mockFocus,
      }),
    };

    applyAiDiffToSelection(mockEditor, 'Toàn bộ văn bản mới');
    expect(mockDeleteRange).toHaveBeenCalledWith({ from: 0, to: 150 });
    expect(mockInsertContent).toHaveBeenCalledWith('Toàn bộ văn bản mới');
  });

  it('should respect explicit range and isFullDocument options in applyAiDiffToSelection', () => {
    const mockInsertContent = vi.fn().mockReturnThis();
    const mockDeleteRange = vi.fn().mockReturnThis();
    const mockFocus = vi.fn().mockReturnValue({
      deleteRange: mockDeleteRange,
      insertContent: mockInsertContent,
      run: vi.fn(),
    });

    const mockEditor = {
      state: {
        selection: { from: 5, to: 5 },
        doc: {
          content: { size: 200 },
        },
      },
      chain: vi.fn().mockReturnValue({
        focus: mockFocus,
      }),
    };

    // Test explicit range
    applyAiDiffToSelection(mockEditor, 'Đoạn thay thế', { range: { from: 20, to: 50 } });
    expect(mockDeleteRange).toHaveBeenCalledWith({ from: 20, to: 50 });

    // Test explicit isFullDocument = true
    applyAiDiffToSelection(mockEditor, 'Văn bản toàn bộ', { isFullDocument: true });
    expect(mockDeleteRange).toHaveBeenCalledWith({ from: 0, to: 200 });
  });
});
