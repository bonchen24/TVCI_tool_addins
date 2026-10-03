import { describe, it, expect } from 'vitest';
import { Editor } from '@tiptap/core';
import { coreEditorExtensions } from '@/editor/extensions';
import { defaultDocumentState } from '@/editor/schema';
import { tiptapDocToSnapshots } from '@/editor/tiptap-adapter';

describe('Default Administrative Document Schema', () => {
  it('validates default document AST structure against NĐ 30 requirements', () => {
    expect(defaultDocumentState.type).toBe('doc');
    expect(Array.isArray(defaultDocumentState.content)).toBe(true);

    const content = defaultDocumentState.content!;
    expect(content.length).toBeGreaterThanOrEqual(4);

    // Header table verification
    const headerTable = content[0];
    expect(headerTable.type).toBe('table');
    expect(headerTable.attrs?.tableType).toBe('admin-header');
    expect(headerTable.attrs?.isBorderless).toBe(true);
    expect(headerTable.attrs?.columnRatio).toBe('40-60');

    const headerRow = headerTable.content![0];
    expect(headerRow.content).toHaveLength(2);
    expect(headerRow.content![0].attrs?.cellType).toBe('header-left');
    expect(headerRow.content![1].attrs?.cellType).toBe('header-right');

    // Footer table verification
    const footerTable = content[content.length - 1];
    expect(footerTable.type).toBe('table');
    expect(footerTable.attrs?.tableType).toBe('admin-footer');
    expect(footerTable.attrs?.isBorderless).toBe(true);
    expect(footerTable.attrs?.columnRatio).toBe('50-50');

    const footerRow = footerTable.content![0];
    expect(footerRow.content).toHaveLength(2);
    expect(footerRow.content![0].attrs?.cellType).toBe('footer-recipients');
    expect(footerRow.content![1].attrs?.cellType).toBe('footer-signer');
  });

  it('hydrates defaultDocumentState into Tiptap Editor without schema violations', () => {
    const editor = new Editor({
      extensions: coreEditorExtensions,
      content: defaultDocumentState,
    });

    const json = editor.getJSON();
    expect(json.type).toBe('doc');
    expect(json.content?.length).toBe(defaultDocumentState.content?.length);

    // Verify snapshot generation from hydrated editor document
    const snapshots = tiptapDocToSnapshots(json);
    expect(snapshots.length).toBeGreaterThan(5);

    // Check header agency
    const agencySnapshot = snapshots.find((s) =>
      s.text.includes('VIỆN CƠ KHÍ NĂNG LƯỢNG VÀ MỎ')
    );
    expect(agencySnapshot).toBeDefined();
    expect(agencySnapshot?.alignment).toBe('Centered');
    expect(agencySnapshot?.bold).toBe(true);

    // Check recipients header
    const recipientsSnapshot = snapshots.find((s) => s.text.includes('Nơi nhận:'));
    expect(recipientsSnapshot).toBeDefined();
    expect(recipientsSnapshot?.bold).toBe(true);
    expect(recipientsSnapshot?.italic).toBe(true);
    expect(recipientsSnapshot?.fontSize).toBe(12);

    editor.destroy();
  });
});
