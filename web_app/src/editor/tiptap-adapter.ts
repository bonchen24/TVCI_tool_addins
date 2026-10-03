import type { JSONContent } from '@tiptap/core';
import type { Editor } from '@tiptap/react';
import type { ParagraphSnapshot, SupportedAlignment, FormattingPatch } from '@/rules/models';

// ponytail: simple recursive traversal extracts paragraphs and table cell paragraphs; upgrade when multi-section pagination rules are added.
export function tiptapDocToSnapshots(doc: JSONContent): ParagraphSnapshot[] {
  const snapshots: ParagraphSnapshot[] = [];
  let index = 0;

  if (!doc || typeof doc !== 'object') {
    return snapshots;
  }

  function traverse(node: JSONContent | null | undefined, currentContext?: string) {
    if (!node || typeof node !== 'object') {
      return;
    }

    let nextContext = currentContext;

    if (node.type === 'tableCell' && node.attrs && typeof node.attrs === 'object' && node.attrs.cellType) {
      nextContext = node.attrs.cellType;
    }

    if (node.type === 'paragraph' || node.type === 'heading') {
      const contentList = Array.isArray(node.content) ? node.content : [];
      const text = contentList
        .map((c) => (c && typeof c === 'object' && typeof c.text === 'string' ? c.text : ''))
        .join('');
      const attrs = node.attrs && typeof node.attrs === 'object' ? node.attrs : {};

      let alignment: SupportedAlignment = 'Justified';
      if (attrs.textAlign === 'center') alignment = 'Centered';
      else if (attrs.textAlign === 'right') alignment = 'Right';
      else if (attrs.textAlign === 'left') alignment = 'Left';
      else if (attrs.textAlign === 'justify') alignment = 'Justified';

      snapshots.push({
        id: `node-${index++}`,
        text,
        fontName: attrs.fontFamily || 'Times New Roman',
        fontSize: typeof attrs.fontSize === 'number' ? attrs.fontSize : 13,
        bold: Boolean(
          contentList.some((c) => c && Array.isArray(c.marks) && c.marks.some((m) => m && m.type === 'bold'))
        ),
        italic: Boolean(
          contentList.some((c) => c && Array.isArray(c.marks) && c.marks.some((m) => m && m.type === 'italic'))
        ),
        underline: Boolean(
          contentList.some((c) => c && Array.isArray(c.marks) && c.marks.some((m) => m && m.type === 'underline'))
        ),
        alignment,
        spaceBefore: attrs.spaceBefore ?? 2,
        spaceAfter: attrs.spaceAfter ?? 2,
        firstLineIndentMm:
          attrs.firstLineIndentMm ?? (alignment === 'Centered' || alignment === 'Right' ? 0 : 10),
        lineSpacingMultiple: attrs.lineSpacing ?? 1.2,
        lineSpacingRule: 'multiple',
        context: nextContext,
      });
    }

    if (Array.isArray(node.content)) {
      for (const child of node.content) {
        traverse(child, nextContext);
      }
    }
  }

  traverse(doc);
  return snapshots;
}

export function applyPatchToEditorNode(
  editor: Editor,
  nodeIndex: number,
  patch: FormattingPatch
): void {
  if (!editor || !editor.state || !editor.view || nodeIndex < 0) {
    return;
  }

  let currentIndex = 0;
  const target: { pos: number | null; attrs: Record<string, unknown> | null } = { pos: null, attrs: null };

  editor.state.doc.descendants((node, pos) => {
    if (target.pos !== null) {
      return false;
    }
    if (node.type.name === 'paragraph' || node.type.name === 'heading') {
      if (currentIndex === nodeIndex) {
        target.pos = pos;
        target.attrs = { ...node.attrs };
        return false;
      }
      currentIndex++;
    }
    return true;
  });

  if (target.pos !== null && target.attrs !== null) {
    const targetPos = target.pos;
    const updates: Record<string, unknown> = { ...target.attrs };

    if (patch.fontName) {
      updates.fontFamily = patch.fontName;
    }

    if (patch.fontSize !== undefined) {
      updates.fontSize = Math.min(72, Math.max(6, patch.fontSize));
    }

    if (patch.lineSpacingMultiple !== undefined) {
      updates.lineSpacing = Math.min(2.0, Math.max(1.0, patch.lineSpacingMultiple));
    }

    if (patch.spaceBefore !== undefined) {
      updates.spaceBefore = Math.max(0, patch.spaceBefore);
    }

    if (patch.spaceAfter !== undefined) {
      updates.spaceAfter = Math.max(0, patch.spaceAfter);
    }

    if (patch.firstLineIndentMm !== undefined) {
      updates.firstLineIndentMm = Math.max(0, patch.firstLineIndentMm);
    }

    if (patch.alignment) {
      const align = patch.alignment.toLowerCase();
      if (align === 'centered' || align === 'center') {
        updates.textAlign = 'center';
      } else if (align === 'justified' || align === 'justify') {
        updates.textAlign = 'justify';
      } else if (align === 'left' || align === 'right') {
        updates.textAlign = align;
      }
    }

    const tr = editor.state.tr.setNodeMarkup(targetPos, undefined, updates);
    editor.view.dispatch(tr);
  }
}
