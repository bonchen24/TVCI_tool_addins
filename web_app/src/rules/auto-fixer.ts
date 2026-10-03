import type { Editor } from '@tiptap/core';
import type { Node as ProseMirrorNode } from '@tiptap/pm/model';
import type { FormattingPatch, LineSpacingRule, SupportedAlignment, ValidationIssue } from './models';

function resolveFixValue(issue: ValidationIssue): string | number | boolean {
  return issue.fixValue ?? issue.expected;
}

export function resolveIssueNodeIndex(issue: ValidationIssue): number | null {
  if (typeof issue.paragraphIndex === 'number' && issue.paragraphIndex >= 0) {
    return issue.paragraphIndex;
  }
  if (issue.targetId) {
    const match = issue.targetId.match(/^node-(\d+)/);
    if (match) {
      return parseInt(match[1], 10);
    }
  }
  if (issue.id) {
    const match = issue.id.match(/^node-(\d+)/);
    if (match) {
      return parseInt(match[1], 10);
    }
  }
  return null;
}

export function issueToPatch(issue: ValidationIssue): FormattingPatch {
  const patch: FormattingPatch = {};
  const nodeIndex = resolveIssueNodeIndex(issue);
  if (nodeIndex !== null) {
    patch.paragraphIndex = nodeIndex;
  }

  const rawVal = resolveFixValue(issue);
  const ruleId = (issue.ruleId || '').toUpperCase();

  // 0. Text Replacement (Punctuation, Addressee, Recipients, Legal Basis, Signer Role Uppercase)
  if (
    (issue.ruleId.startsWith('text.') ||
      ruleId.startsWith('TEXT.') ||
      ruleId.includes('PUNCTUATION') ||
      ruleId.includes('COLON') ||
      issue.ruleId === 'signer.role.uppercase' ||
      ruleId.includes('SIGNER.ROLE.UPPERCASE')) &&
    (issue.fixValue !== undefined || typeof rawVal === 'string')
  ) {
    patch.textReplacement = String(issue.fixValue ?? rawVal);
    return patch;
  }

  // 1. Font Family
  if (ruleId === 'FONT_NAME' || ruleId.endsWith('.FONTNAME') || ruleId.endsWith('.FONT')) {
    patch.fontName = 'Times New Roman';
    return patch;
  }

  // 2. Alignment
  if (ruleId === 'BODY_ALIGNMENT' || ruleId.endsWith('.ALIGNMENT')) {
    const valStr = String(rawVal).toLowerCase();
    let alignment: SupportedAlignment = 'Justified';
    if (valStr.includes('center')) alignment = 'Centered';
    else if (valStr.includes('right')) alignment = 'Right';
    else if (valStr.includes('left')) alignment = 'Left';
    else if (valStr.includes('justif')) alignment = 'Justified';
    patch.alignment = alignment;
    return patch;
  }

  // 3. Indent
  if (ruleId === 'BODY_INDENT' || ruleId.includes('FIRSTLINEINDENT')) {
    patch.firstLineIndentMm = typeof rawVal === 'number' ? rawVal : 10;
    return patch;
  }

  // 4. Line Spacing
  if (ruleId === 'BODY_LINE_SPACING' || ruleId.includes('LINESPACING')) {
    patch.lineSpacingMultiple = typeof rawVal === 'number' ? rawVal : 1.2;
    return patch;
  }

  // 5. Space Before / After
  if (ruleId.endsWith('.SPACEBEFORE')) {
    patch.spaceBefore = typeof rawVal === 'number' ? rawVal : 2;
    return patch;
  }
  if (ruleId.endsWith('.SPACEAFTER')) {
    patch.spaceAfter = typeof rawVal === 'number' ? rawVal : 2;
    return patch;
  }

  // 6. Font Size
  if (ruleId === 'FONT_SIZE' || ruleId.endsWith('.FONTSIZE') || ruleId.endsWith('.SIZE')) {
    let size = typeof rawVal === 'number' ? rawVal : parseFloat(String(rawVal));
    if (isNaN(size)) {
      if (ruleId.includes('NATIONAL_EMBLEM') || ruleId.includes('AGENCY_NAME')) size = 12;
      else if (ruleId.includes('RECIPIENTS')) size = 11;
      else size = 13;
    }
    patch.fontSize = size;
    patch.fontSizePt = size;
    return patch;
  }

  // 7. Bold mark
  if (ruleId.endsWith('.BOLD')) {
    patch.bold = Boolean(rawVal);
    return patch;
  }

  // 8. Italic mark
  if (ruleId.endsWith('.ITALIC')) {
    patch.italic = Boolean(rawVal);
    return patch;
  }

  // 9. Underline mark
  if (ruleId.endsWith('.UNDERLINE')) {
    patch.underline = Boolean(rawVal);
    return patch;
  }

  // 10. Page Margins
  if (ruleId === 'PAGE_MARGINS' || ruleId.startsWith('PAGE.')) {
    patch.pageMargins = {
      topMm: 20,
      bottomMarginMm: 20,
      bottomMm: 20,
      leftMarginMm: 30,
      leftMm: 30,
      rightMarginMm: 15,
      rightMm: 15,
    };
    return patch;
  }

  // Fallback field parsing
  const componentParts = issue.ruleId.split('.');
  const field = issue.ruleId.startsWith('component.')
    ? componentParts[componentParts.length - 1]
    : issue.ruleId.replace('body.', '');

  switch (field) {
    case 'fontName':
      patch.fontName = String(rawVal);
      break;
    case 'fontSize':
      patch.fontSize = Number(rawVal);
      patch.fontSizePt = Number(rawVal);
      break;
    case 'alignment':
      patch.alignment = String(rawVal) as SupportedAlignment;
      break;
    case 'spaceBefore':
      patch.spaceBefore = Number(rawVal);
      break;
    case 'spaceAfter':
      patch.spaceAfter = Number(rawVal);
      break;
    case 'firstLineIndentMm':
      patch.firstLineIndentMm = Number(rawVal);
      break;
    case 'lineSpacingPt':
      patch.lineSpacingPt = Number(rawVal);
      break;
    case 'lineSpacingRule':
      patch.lineSpacingRule = String(rawVal) as LineSpacingRule;
      break;
    case 'lineSpacingMultiple':
      patch.lineSpacingMultiple = Number(rawVal);
      break;
    case 'bold':
      patch.bold = Boolean(rawVal);
      break;
    case 'italic':
      patch.italic = Boolean(rawVal);
      break;
    case 'underline':
      patch.underline = Boolean(rawVal);
      break;
    case 'textReplacement':
      patch.textReplacement = String(rawVal);
      break;
    default:
      break;
  }

  return patch;
}

export function groupFixableIssues(issues: ValidationIssue[]): Map<number, FormattingPatch> {
  const patchMap = new Map<number, FormattingPatch>();

  for (const issue of issues) {
    if (!issue.autoFixable || issue.status === 'PASS') continue;
    const nodeIndex = resolveIssueNodeIndex(issue);
    if (nodeIndex === null) continue;

    const patch = issueToPatch(issue);
    if (!patch || Object.keys(patch).length === 0) continue;

    const existing = patchMap.get(nodeIndex) || {};
    patchMap.set(nodeIndex, {
      ...existing,
      ...patch,
      paragraphIndex: nodeIndex,
    });
  }

  return patchMap;
}

export function applyFormattingPatch(editor: Editor | null | undefined, nodeIndex: number, patch: FormattingPatch): void {
  if (!editor || !editor.state || !editor.view || nodeIndex < 0) return;

  let currentIndex = 0;
  const targetRef: { current: { pos: number; node: ProseMirrorNode } | null } = { current: null };

  editor.state.doc.descendants((node, pos) => {
    if (targetRef.current !== null) return false;
    if (node.type.name === 'paragraph' || node.type.name === 'heading') {
      if (currentIndex === nodeIndex) {
        targetRef.current = { pos, node };
        return false;
      }
      currentIndex++;
    }
    return true;
  });

  const foundTarget = targetRef.current;
  if (foundTarget !== null) {
    const { pos, node: targetNode } = foundTarget;
    const tr = editor.state.tr;
    const updates: Record<string, unknown> = { ...targetNode.attrs };

    if (patch.fontName) {
      updates.fontFamily = patch.fontName;
    }
    const fontSize = patch.fontSize ?? patch.fontSizePt;
    if (fontSize !== undefined) {
      updates.fontSize = Math.min(72, Math.max(6, fontSize));
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

    tr.setNodeMarkup(pos, undefined, updates);

    const schema = editor.state.schema;
    if (patch.textReplacement !== undefined && targetNode.isTextblock) {
      const from = pos + 1;
      const to = pos + targetNode.nodeSize - 1;
      if (patch.textReplacement.length === 0) {
        if (from < to) tr.delete(from, to);
      } else {
        tr.replaceWith(from, to, schema.text(patch.textReplacement, targetNode.firstChild?.marks));
      }
    }

    // Apply inline text marks if node has content
    const from = pos + 1;
    const to =
      patch.textReplacement !== undefined
        ? from + patch.textReplacement.length
        : pos + targetNode.nodeSize - 1;

    if (from < to) {
      if (patch.bold !== undefined && schema.marks.bold) {
        if (patch.bold) tr.addMark(from, to, schema.marks.bold.create());
        else tr.removeMark(from, to, schema.marks.bold);
      }
      if (patch.italic !== undefined && schema.marks.italic) {
        if (patch.italic) tr.addMark(from, to, schema.marks.italic.create());
        else tr.removeMark(from, to, schema.marks.italic);
      }
      if (patch.underline !== undefined && schema.marks.underline) {
        if (patch.underline) tr.addMark(from, to, schema.marks.underline.create());
        else tr.removeMark(from, to, schema.marks.underline);
      }
    }

    editor.view.dispatch(tr);
  }
}

export function applySingleFix(editor: Editor | null | undefined, issue: ValidationIssue): boolean {
  if (!issue.autoFixable) return false;
  const nodeIndex = resolveIssueNodeIndex(issue);
  if (nodeIndex === null) return false;

  const patch = issueToPatch(issue);
  applyFormattingPatch(editor, nodeIndex, patch);
  return true;
}

export function applySafeFixes(
  editor: Editor | null | undefined,
  issues: ValidationIssue[]
): { appliedCount: number; fixedNodeCount: number } {
  if (!editor || !editor.state || !editor.view || !issues || issues.length === 0) {
    return { appliedCount: 0, fixedNodeCount: 0 };
  }

  const patchMap = groupFixableIssues(issues);
  if (patchMap.size === 0) {
    return { appliedCount: 0, fixedNodeCount: 0 };
  }

  const tr = editor.state.tr;
  const schema = editor.state.schema;
  let currentIndex = 0;
  let appliedCount = 0;
  let fixedNodeCount = 0;

  // Single-pass doc traversal for atomic transaction
  editor.state.doc.descendants((node, pos) => {
    if (node.type.name === 'paragraph' || node.type.name === 'heading') {
      const patch = patchMap.get(currentIndex);
      if (patch) {
        const targetPos = tr.mapping.map(pos);
        const targetNode = tr.doc.nodeAt(targetPos) ?? node;
        const updates: Record<string, unknown> = { ...targetNode.attrs };

        if (patch.fontName) {
          updates.fontFamily = patch.fontName;
        }
        const fontSize = patch.fontSize ?? patch.fontSizePt;
        if (fontSize !== undefined) {
          updates.fontSize = Math.min(72, Math.max(6, fontSize));
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

        tr.setNodeMarkup(targetPos, undefined, updates);

        if (patch.textReplacement !== undefined && targetNode.isTextblock) {
          const repFrom = targetPos + 1;
          const repTo = targetPos + targetNode.nodeSize - 1;
          if (patch.textReplacement.length === 0) {
            if (repFrom < repTo) tr.delete(repFrom, repTo);
          } else {
            tr.replaceWith(repFrom, repTo, schema.text(patch.textReplacement, targetNode.firstChild?.marks));
          }
        }

        const from = targetPos + 1;
        const to =
          patch.textReplacement !== undefined
            ? from + patch.textReplacement.length
            : targetPos + targetNode.nodeSize - 1;

        if (from < to) {
          if (patch.bold !== undefined && schema.marks.bold) {
            if (patch.bold) tr.addMark(from, to, schema.marks.bold.create());
            else tr.removeMark(from, to, schema.marks.bold);
          }
          if (patch.italic !== undefined && schema.marks.italic) {
            if (patch.italic) tr.addMark(from, to, schema.marks.italic.create());
            else tr.removeMark(from, to, schema.marks.italic);
          }
          if (patch.underline !== undefined && schema.marks.underline) {
            if (patch.underline) tr.addMark(from, to, schema.marks.underline.create());
            else tr.removeMark(from, to, schema.marks.underline);
          }
        }

        fixedNodeCount++;
      }
      currentIndex++;
    }
    return true;
  });

  appliedCount = issues.filter((i) => i.autoFixable && i.status !== 'PASS').length;
  editor.view.dispatch(tr);

  return { appliedCount, fixedNodeCount };
}
