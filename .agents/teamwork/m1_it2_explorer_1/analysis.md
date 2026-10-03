# Detailed Remediation Analysis & Specifications: `web_app/src/editor/tiptap-adapter.ts`

**Target File**: `web_app/src/editor/tiptap-adapter.ts`  
**Test File**: `web_app/tests/unit/tiptap-adapter.test.ts`  
**Author**: M1 Iteration 2 Explorer 1  
**Timestamp**: 2026-09-29T03:12:00Z  

---

## 1. Defect Root Cause Analysis

### Defect 1: Cascade Mutation across Subsequent Paragraphs in `applyPatchToEditorNode`
- **Location**: `web_app/src/editor/tiptap-adapter.ts:61-85`
- **Current Code**:
  ```typescript
  let currentIndex = 0;
  editor.state.doc.descendants((node, pos) => {
    if (node.type.name === 'paragraph' || node.type.name === 'heading') {
      if (currentIndex === nodeIndex) {
        const updates: Record<string, any> = { ...node.attrs };
        // ... updates ...
        const tr = editor.state.tr.setNodeMarkup(pos, undefined, updates);
        editor.view.dispatch(tr);
        return false;
      }
      currentIndex++;
    }
    return true;
  });
  ```
- **Root Cause**:
  1. In ProseMirror, `doc.descendants(fn)` walks the document tree. Returning `false` from `fn` only tells ProseMirror **not to descend into children** of the current node. It does **not** terminate the iteration over sibling nodes or following subtrees.
  2. When `currentIndex === nodeIndex`, `return false` exits the callback before `currentIndex++` (line 82) is evaluated.
  3. Consequently, for every sibling paragraph and heading encountered afterward, `currentIndex` remains unchanged and equal to `nodeIndex`.
  4. Every following paragraph triggers `if (currentIndex === nodeIndex)`, overwriting the entire remainder of the document with the formatting patch and dispatching multiple conflicting transactions.
- **Remediation**:
  Decouple search from mutation. Store `targetPos` and `targetAttrs`. When `targetPos !== null`, short-circuit callback execution. Dispatch exactly one transaction after traversal concludes.

---

### Defect 2: Alignment Name Mapping Incompatibility
- **Location**: `web_app/src/editor/tiptap-adapter.ts:73-76`
- **Current Code**:
  ```typescript
  if (patch.alignment) {
    const align = patch.alignment.toLowerCase();
    updates.textAlign = align === 'centered' ? 'center' : align;
  }
  ```
- **Root Cause**:
  1. `models.ts:1` defines `SupportedAlignment = 'Left' | 'Centered' | 'Right' | 'Justified'`.
  2. When `patch.alignment === 'Justified'`, `align` becomes `'justified'`.
  3. Tiptap's `TextAlign` extension (`extensions.ts:439-443`) only accepts `['left', 'center', 'right', 'justify']`.
  4. Setting `updates.textAlign = 'justified'` introduces an invalid attribute value that fails CSS rendering and does not match `attrs.textAlign === 'justify'` in `tiptapDocToSnapshots` (line 25).
- **Remediation**:
  Explicitly map both `'justified'` and `'justify'` to `'justify'`, and `'centered'` and `'center'` to `'center'`.

---

### Defect 3: Falsy Numeric Checks & Unbounded Parameter Injection
- **Location**: `web_app/src/editor/tiptap-adapter.ts:67-68`
- **Current Code**:
  ```typescript
  if (patch.fontSize) updates.fontSize = patch.fontSize;
  if (patch.lineSpacingMultiple) updates.lineSpacing = patch.lineSpacingMultiple;
  ```
- **Root Cause**:
  1. In JavaScript, `0` is falsy. If `patch.fontSize === 0` or `patch.lineSpacingMultiple === 0`, the truthy check fails and the patch attribute is dropped silently.
  2. `web_app/e2e-tests/runner.js:819-838` (Tier 2 Boundary Specifications) requires:
     - Font sizes clamped to administrative bounds (`6pt` to `72pt`).
     - Line spacing clamped to administrative bounds (`1.0x` to `2.0x`).
     - Negative indentation and paragraph spacing normalized to `>= 0`.
- **Remediation**:
  Use strict `!== undefined` guards, and clamp values using `Math.max` and `Math.min`.

---

### Defect 4: Malformed AST Null Safety in `tiptapDocToSnapshots`
- **Location**: `web_app/src/editor/tiptap-adapter.ts:10-20, 32-34, 45-49`
- **Current Code**:
  ```typescript
  const text = node.content?.map((c) => c.text || '').join('') || '';
  bold: Boolean(node.content?.some((c) => c.marks?.some((m) => m.type === 'bold'))),
  ```
- **Root Cause**:
  1. If `doc` is `null` or `undefined`, `traverse(doc)` throws `TypeError: Cannot read properties of null (reading 'type')`.
  2. If `node.content` contains non-object or null entries (e.g. `[null]`), `c.text` throws `TypeError: Cannot read properties of null`.
  3. If `node.content` is malformed (e.g. `{ content: {} }`), `.map()` throws `TypeError: node.content.map is not a function`.
- **Remediation**:
  Add defensive boundary guards `!doc || typeof doc !== 'object'`, verify `Array.isArray(node.content)`, and check object types before accessing properties.

---

## 2. Complete Proposed Replacement Code: `web_app/src/editor/tiptap-adapter.ts`

```typescript
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
  let targetPos: number | null = null;
  let targetAttrs: Record<string, any> | null = null;

  editor.state.doc.descendants((node, pos) => {
    if (targetPos !== null) {
      return false;
    }
    if (node.type.name === 'paragraph' || node.type.name === 'heading') {
      if (currentIndex === nodeIndex) {
        targetPos = pos;
        targetAttrs = { ...node.attrs };
        return false;
      }
      currentIndex++;
    }
    return true;
  });

  if (targetPos !== null && targetAttrs !== null) {
    const updates: Record<string, any> = { ...targetAttrs };

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
```

---

## 3. Unit Test Specification: `web_app/tests/unit/tiptap-adapter.test.ts`

The following test suites must be appended to `web_app/tests/unit/tiptap-adapter.test.ts`:

```typescript
  it('applies patch ONLY to target paragraph without cascading mutations to subsequent paragraphs', () => {
    const editor = new Editor({
      extensions: [
        Document,
        AdministrativeParagraph,
        Text,
        Bold,
        Italic,
        TextAlign.configure({
          types: ['paragraph'],
          alignments: ['left', 'center', 'right', 'justify'],
        }),
      ],
      content: `
        <p>Đoạn 1: Tiêu đề cơ quan ban hành</p>
        <p>Đoạn 2: Nội dung công văn cần sửa định dạng</p>
        <p>Đoạn 3: Nơi nhận và chữ ký người có thẩm quyền</p>
      `,
    });

    // 1. Initial snapshot of paragraphs
    const initialNodes: Array<{ text: string; attrs: any }> = [];
    editor.state.doc.descendants((node) => {
      if (node.type.name === 'paragraph') {
        initialNodes.push({ text: node.textContent, attrs: { ...node.attrs } });
      }
    });

    expect(initialNodes).toHaveLength(3);
    const para0Initial = { ...initialNodes[0].attrs };
    const para2Initial = { ...initialNodes[2].attrs };

    // 2. Apply patch ONLY to paragraph index 1 (the middle paragraph)
    applyPatchToEditorNode(editor, 1, {
      fontSize: 16,
      alignment: 'Justified',
      lineSpacingMultiple: 1.5,
      spaceBefore: 6,
      spaceAfter: 8,
      firstLineIndentMm: 15,
    });

    // 3. Inspect all paragraph nodes after mutation
    const updatedNodes: Array<{ text: string; attrs: any }> = [];
    editor.state.doc.descendants((node) => {
      if (node.type.name === 'paragraph') {
        updatedNodes.push({ text: node.textContent, attrs: { ...node.attrs } });
      }
    });

    expect(updatedNodes).toHaveLength(3);

    // Assert: Paragraph 0 is completely untouched
    expect(updatedNodes[0].attrs.fontSize).toBe(para0Initial.fontSize);
    expect(updatedNodes[0].attrs.textAlign).toBe(para0Initial.textAlign);
    expect(updatedNodes[0].attrs.lineSpacing).toBe(para0Initial.lineSpacing);
    expect(updatedNodes[0].attrs.spaceBefore).toBe(para0Initial.spaceBefore);
    expect(updatedNodes[0].attrs.spaceAfter).toBe(para0Initial.spaceAfter);
    expect(updatedNodes[0].attrs.firstLineIndentMm).toBe(para0Initial.firstLineIndentMm);

    // Assert: Paragraph 1 has the applied patch
    expect(updatedNodes[1].attrs.fontSize).toBe(16);
    expect(updatedNodes[1].attrs.textAlign).toBe('justify');
    expect(updatedNodes[1].attrs.lineSpacing).toBe(1.5);
    expect(updatedNodes[1].attrs.spaceBefore).toBe(6);
    expect(updatedNodes[1].attrs.spaceAfter).toBe(8);
    expect(updatedNodes[1].attrs.firstLineIndentMm).toBe(15);

    // Assert: Paragraph 2 is completely untouched (NO CASCADE)
    expect(updatedNodes[2].attrs.fontSize).toBe(para2Initial.fontSize);
    expect(updatedNodes[2].attrs.textAlign).toBe(para2Initial.textAlign);
    expect(updatedNodes[2].attrs.lineSpacing).toBe(para2Initial.lineSpacing);
    expect(updatedNodes[2].attrs.spaceBefore).toBe(para2Initial.spaceBefore);
    expect(updatedNodes[2].attrs.spaceAfter).toBe(para2Initial.spaceAfter);
    expect(updatedNodes[2].attrs.firstLineIndentMm).toBe(para2Initial.firstLineIndentMm);

    editor.destroy();
  });

  it('correctly maps alignment strings (Justified -> justify, Centered -> center)', () => {
    const editor = new Editor({
      extensions: [
        Document,
        AdministrativeParagraph,
        Text,
        TextAlign.configure({
          types: ['paragraph'],
          alignments: ['left', 'center', 'right', 'justify'],
        }),
      ],
      content: '<p>Văn bản kiểm tra căn lề</p>',
    });

    // Test Justified
    applyPatchToEditorNode(editor, 0, { alignment: 'Justified' });
    let attrs = editor.getAttributes('paragraph');
    expect(attrs.textAlign).toBe('justify');

    // Test Centered
    applyPatchToEditorNode(editor, 0, { alignment: 'Centered' });
    attrs = editor.getAttributes('paragraph');
    expect(attrs.textAlign).toBe('center');

    // Test Right
    applyPatchToEditorNode(editor, 0, { alignment: 'Right' });
    attrs = editor.getAttributes('paragraph');
    expect(attrs.textAlign).toBe('right');

    // Test Left
    applyPatchToEditorNode(editor, 0, { alignment: 'Left' });
    attrs = editor.getAttributes('paragraph');
    expect(attrs.textAlign).toBe('left');

    editor.destroy();
  });

  it('handles falsy numeric values and clamps boundary values', () => {
    const editor = new Editor({
      extensions: [
        Document,
        AdministrativeParagraph,
        Text,
        TextAlign.configure({ types: ['paragraph'] }),
      ],
      content: '<p>Văn bản kiểm tra giá trị biên</p>',
    });

    // Under-boundary values (fontSize 0 -> clamp to 6, lineSpacing 0.2 -> clamp to 1.0, negative indents -> 0)
    applyPatchToEditorNode(editor, 0, {
      fontSize: 0,
      lineSpacingMultiple: 0.2,
      spaceBefore: -10,
      spaceAfter: -5,
      firstLineIndentMm: -20,
    });

    let attrs = editor.getAttributes('paragraph');
    expect(attrs.fontSize).toBe(6);
    expect(attrs.lineSpacing).toBe(1.0);
    expect(attrs.spaceBefore).toBe(0);
    expect(attrs.spaceAfter).toBe(0);
    expect(attrs.firstLineIndentMm).toBe(0);

    // Over-boundary values (fontSize 999 -> clamp to 72, lineSpacing 10.0 -> clamp to 2.0)
    applyPatchToEditorNode(editor, 0, {
      fontSize: 999,
      lineSpacingMultiple: 10.0,
    });

    attrs = editor.getAttributes('paragraph');
    expect(attrs.fontSize).toBe(72);
    expect(attrs.lineSpacing).toBe(2.0);

    editor.destroy();
  });

  it('defensively handles null, undefined, and malformed JSONContent in tiptapDocToSnapshots', () => {
    // Null and undefined inputs
    expect(tiptapDocToSnapshots(null as any)).toEqual([]);
    expect(tiptapDocToSnapshots(undefined as any)).toEqual([]);
    expect(tiptapDocToSnapshots({} as any)).toEqual([]);

    // Malformed children and null content elements
    const malformedDoc: any = {
      type: 'doc',
      content: [
        null,
        undefined,
        {
          type: 'paragraph',
          content: [null, { type: 'text', text: 'An toàn' }, undefined],
        },
        {
          type: 'paragraph',
          content: 'not-an-array',
        },
      ],
    };

    const snapshots = tiptapDocToSnapshots(malformedDoc);
    expect(snapshots).toHaveLength(2);
    expect(snapshots[0].text).toBe('An toàn');
    expect(snapshots[1].text).toBe('');
  });
```
