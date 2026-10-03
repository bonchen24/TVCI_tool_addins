# Root Cause Analysis & Remediation Specification: Auto-Fixer Text Punctuation Replacement

**Target Component**: `web_app/src/rules/auto-fixer.ts`  
**Related Models**: `web_app/src/rules/models.ts`  
**Related Adapter**: `web_app/src/editor/tiptap-adapter.ts`  
**Unit Tests**: `web_app/tests/unit/auto-fixer.test.ts`  
**Author**: M3 Iteration 2 Explorer 3 (`m3_it2_explorer_3`)  
**Date**: 2026-09-29  

---

## 1. Problem Statement & Root Cause

### 1.1 The Failure Mode
Administrative format validators (`addressee-validator.ts`, `recipients-validator.ts`, `legal-basis-validator.ts`) validate Vietnamese administrative text syntax under NĐ 30/2020 and Party guidelines. When syntax errors occur (such as missing colons, invalid trailing punctuation, or incorrect semicolons/periods), the validators generate `ValidationIssue` objects configured with:
- `autoFixable: true`
- `fixValue`: Corrected string with proper punctuation (e.g. `"Kính gửi: Ban Giám đốc"`, `"Nơi nhận: Như trên"`, `"Căn cứ Luật Doanh nghiệp;"`)
- `ruleId`: Starting with `text.` (e.g. `text.addressee.colon`, `text.recipients.colon`, `text.legalBasis.punctuation`)

However, during execution:
1. `issueToPatch(issue)` in `web_app/src/rules/auto-fixer.ts` contains handlers only for paragraph attributes (`fontName`, `fontSize`, `alignment`, `firstLineIndentMm`, `lineSpacingMultiple`, `spaceBefore`, `spaceAfter`) and text marks (`bold`, `italic`, `underline`). It has **no handler** for `text.*` rule IDs or text content replacement. As a result, `issueToPatch` returns an empty patch `{ paragraphIndex: X }`.
2. Both `applyFormattingPatch` and `applySafeFixes` in `web_app/src/rules/auto-fixer.ts` only call ProseMirror's `tr.setNodeMarkup(pos, undefined, updates)` and `tr.addMark(from, to, mark)`. They **never call `tr.replaceWith(...)`** or any text modification methods.
3. `applySafeFixes` filters issues by `autoFixable && status !== 'PASS'`, counting them as fixed (`appliedCount > 0`), but the document text in the editor remains unchanged.
4. When the user or audit panel triggers re-evaluation, the exact same text violations persist, trapping the user in an unresolved error loop where "Safe Fix" claims success but fails to fix anything.

### 1.2 Multi-Node Position Drift Pitfall
When replacing text in ProseMirror across multiple paragraphs in a single transaction (`applySafeFixes`):
- Replacing text alters the character length of the node (e.g. adding a colon increases document size by +1 character).
- If the document traversal loop iterates through `editor.state.doc.descendants((node, pos) => ...)`, `pos` represents the position in the *original* unmodified document.
- Modifying a preceding paragraph shifts the start position of all subsequent paragraphs by the delta.
- Without position mapping (`tr.mapping.map(pos)`), any subsequent paragraph modification targets the wrong position in the transaction document `tr.doc`, corrupting markup or throwing `RangeError`.

---

## 2. Technical Remediation Design

### 2.1 Model Extension: `web_app/src/rules/models.ts`
Extend `FormattingPatch` interface to include an optional `textReplacement?: string;` property:

```ts
export interface FormattingPatch {
  paragraphIndex?: number;
  fontName?: string;
  fontSize?: number;
  fontSizePt?: number;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  alignment?: SupportedAlignment;
  spaceBefore?: number;
  spaceAfter?: number;
  firstLineIndentMm?: number;
  lineSpacingPt?: number;
  lineSpacingRule?: LineSpacingRule;
  lineSpacingMultiple?: number;
  textReplacement?: string; // <--- NEW: Replacement text content for the paragraph
  pageMargins?: {
    topMm: number;
    bottomMarginMm?: number;
    bottomMm: number;
    leftMarginMm?: number;
    leftMm: number;
    rightMarginMm?: number;
    rightMm: number;
  };
}
```

### 2.2 Patch Extraction: `issueToPatch` in `web_app/src/rules/auto-fixer.ts`
Add a handler for `text.*` and punctuation rule IDs that extracts the replacement text from `issue.fixValue` (falling back to `rawVal = resolveFixValue(issue)`):

```ts
// 0. Text Replacement (Punctuation, Addressee, Recipients, Legal Basis)
if (
  (issue.ruleId.startsWith('text.') ||
    ruleId.startsWith('TEXT.') ||
    ruleId.includes('PUNCTUATION') ||
    ruleId.includes('COLON')) &&
  (issue.fixValue !== undefined || typeof rawVal === 'string')
) {
  patch.textReplacement = String(issue.fixValue ?? rawVal);
  return patch;
}
```

Also add `case 'textReplacement':` to the fallback switch:
```ts
    case 'textReplacement':
      patch.textReplacement = String(rawVal);
      break;
```

### 2.3 Single Node Fixer: `applyFormattingPatch` in `web_app/src/rules/auto-fixer.ts`
In `applyFormattingPatch`, when `patch.textReplacement !== undefined`, replace paragraph text content using `tr.replaceWith`:
```ts
    tr.setNodeMarkup(targetPos, undefined, updates);

    const schema = editor.state.schema;
    if (patch.textReplacement !== undefined && targetNode.isTextblock) {
      const repFrom = targetPos + 1;
      const repTo = targetPos + targetNode.nodeSize - 1;
      if (patch.textReplacement.length > 0) {
        tr.replaceWith(repFrom, repTo, schema.text(patch.textReplacement, targetNode.firstChild?.marks));
      } else if (repFrom < repTo) {
        tr.delete(repFrom, repTo);
      }
    }

    // Apply inline text marks if node has content
    const from = targetPos + 1;
    const to = patch.textReplacement !== undefined
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

    editor.view.dispatch(tr);
```

### 2.4 Multi-Node Atomic Fixer: `applySafeFixes` in `web_app/src/rules/auto-fixer.ts`
Use `tr.mapping.map(pos)` to dynamically map node positions across text mutations and apply updates atomically:

```ts
  // Single-pass doc traversal for atomic transaction
  editor.state.doc.descendants((node: any, pos: number) => {
    if (node.type.name === 'paragraph' || node.type.name === 'heading') {
      const patch = patchMap.get(currentIndex);
      if (patch) {
        const targetPos = tr.mapping.map(pos);
        const targetNode = tr.doc.nodeAt(targetPos) ?? node;
        const updates: Record<string, any> = { ...targetNode.attrs };

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
          if (patch.textReplacement.length > 0) {
            tr.replaceWith(repFrom, repTo, schema.text(patch.textReplacement, targetNode.firstChild?.marks));
          } else if (repFrom < repTo) {
            tr.delete(repFrom, repTo);
          }
        }

        const from = targetPos + 1;
        const to = patch.textReplacement !== undefined
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
```

### 2.5 Adapter Consistency: `applyPatchToEditorNode` in `web_app/src/editor/tiptap-adapter.ts`
Apply the same `textReplacement` branch in `applyPatchToEditorNode` to ensure complete parity across editor helpers:
```ts
    const tr = editor.state.tr.setNodeMarkup(targetPos, undefined, updates);

    const schema = editor.state.schema;
    if (patch.textReplacement !== undefined && targetNode.isTextblock) {
      const from = targetPos + 1;
      const to = targetPos + targetNode.nodeSize - 1;
      if (patch.textReplacement.length > 0) {
        tr.replaceWith(from, to, schema.text(patch.textReplacement, targetNode.firstChild?.marks));
      } else if (from < to) {
        tr.delete(from, to);
      }
    }

    editor.view.dispatch(tr);
```

---

## 3. Unit Test Specifications

File: `web_app/tests/unit/auto-fixer.test.ts`

### 3.1 Unit Test 1: Single Fix for Missing Colon
```ts
  it('converts text punctuation issue to textReplacement patch and applies fix', () => {
    editor.commands.setContent('<p>Kính gửi Ban Giám đốc</p>');
    const initialSnapshots = tiptapDocToSnapshots(editor.getJSON());
    const initialSummary = evaluateDocumentRules(initialSnapshots, 'NĐ30_TVCI');
    const colonIssue = initialSummary.issues.find((i) => i.ruleId === 'text.addressee.colon');
    expect(colonIssue).toBeDefined();
    expect(colonIssue?.autoFixable).toBe(true);
    expect(colonIssue?.fixValue).toBe('Kính gửi: Ban Giám đốc');

    const patch = issueToPatch(colonIssue!);
    expect(patch.paragraphIndex).toBe(0);
    expect(patch.textReplacement).toBe('Kính gửi: Ban Giám đốc');

    const success = applySingleFix(editor, colonIssue!);
    expect(success).toBe(true);

    const updatedSnapshots = tiptapDocToSnapshots(editor.getJSON());
    expect(updatedSnapshots[0].text).toBe('Kính gửi: Ban Giám đốc');

    // Re-evaluating should resolve the colon issue
    const recheckedSummary = evaluateDocumentRules(updatedSnapshots, 'NĐ30_TVCI');
    const unresolvedColonIssue = recheckedSummary.issues.find((i) => i.ruleId === 'text.addressee.colon');
    expect(unresolvedColonIssue).toBeUndefined();
  });
```

### 3.2 Unit Test 2: Full Document 100% Convergence with Punctuation Errors
```ts
  it('applies safe fixes to document with text punctuation errors and achieves 100% convergence', () => {
    const docContent = `
      <p style="font-family: Arial; font-size: 10pt; text-align: left;">TRUNG TÂM THỬ NGHIỆM - KIỂM ĐỊNH CÔNG NGHIỆP</p>
      <p style="font-family: Arial; font-size: 10pt; text-align: left;">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</p>
      <p style="font-family: Arial; font-size: 10pt; text-align: left;">Độc lập - Tự do - Hạnh phúc</p>
      <p style="font-family: Arial; font-size: 10pt; text-align: left;">Số: 12/TB-TVCI</p>
      <p style="font-family: Arial; font-size: 10pt; text-align: left;">Hà Nội, ngày 29 tháng 9 năm 2026</p>
      <p style="font-family: Arial; font-size: 10pt; text-align: left;">THÔNG BÁO</p>
      <p style="font-family: Arial; font-size: 10pt; text-align: left;">Về việc chuẩn hóa toàn bộ văn bản</p>
      <p style="font-family: Arial; font-size: 10pt; text-align: left;">Kính gửi Ban Giám đốc</p>
      <p style="font-family: Arial; font-size: 16pt; text-align: left; text-indent: 0mm; line-height: 1.8;">Thực hiện công tác rà soát thể thức theo Nghị định 30/2020/NĐ-CP, toàn bộ các quy cách cần được tự động chỉnh sửa an toàn.</p>
      <p style="font-family: Arial; font-size: 10pt; text-align: left;">GIÁM ĐỐC</p>
      <p style="font-family: Arial; font-size: 10pt; text-align: left;">Nguyễn Văn A</p>
      <p style="font-family: Arial; font-size: 10pt; text-align: left;">Nơi nhận Như trên</p>
    `;

    editor.commands.setContent(docContent);

    // Initial audit: verify punctuation issues exist alongside format issues
    const initialSnapshots = tiptapDocToSnapshots(editor.getJSON());
    const initialSummary = evaluateDocumentRules(initialSnapshots, 'NĐ30_TVCI');
    expect(initialSummary.healthScore).toBeLessThan(70);
    expect(initialSummary.issues.some((i) => i.ruleId === 'text.addressee.colon')).toBe(true);
    expect(initialSummary.issues.some((i) => i.ruleId === 'text.recipients.colon')).toBe(true);

    // Apply safe fixes in a single atomic transaction
    const fixResult = applySafeFixes(editor, initialSummary.issues);
    expect(fixResult.appliedCount).toBeGreaterThanOrEqual(initialSummary.issues.filter((i) => i.autoFixable).length);

    // Verify document content was replaced
    const fixedSnapshots = tiptapDocToSnapshots(editor.getJSON());
    expect(fixedSnapshots[7].text).toBe('Kính gửi: Ban Giám đốc');
    expect(fixedSnapshots[11].text).toBe('Nơi nhận: Như trên');

    // Re-audit after fixes: 100% convergence!
    const fixedSummary = evaluateDocumentRules(fixedSnapshots, 'NĐ30_TVCI');
    expect(fixedSummary.failedRules).toBe(0);
    expect(fixedSummary.healthScore).toBe(100);
  });
```

### 3.3 Unit Test 3: Mark Preservation on Text Replacement
```ts
  it('preserves existing text marks when replacing punctuation', () => {
    editor.commands.setContent('<p><b>Kính gửi Ban Giám đốc</b></p>');
    const colonIssue: ValidationIssue = {
      id: 'node-0-colon',
      ruleId: 'text.addressee.colon',
      targetId: 'node-0',
      paragraphIndex: 0,
      category: 'recipients',
      componentType: 'ADDRESSEE',
      message: 'Thiếu dấu hai chấm',
      severity: 'error',
      status: 'FAIL',
      autoFixable: true,
      actual: 'Kính gửi Ban Giám đốc',
      expected: 'Kính gửi: Ban Giám đốc',
      fixValue: 'Kính gửi: Ban Giám đốc',
    };

    const success = applySingleFix(editor, colonIssue);
    expect(success).toBe(true);

    const snapshots = tiptapDocToSnapshots(editor.getJSON());
    expect(snapshots[0].text).toBe('Kính gửi: Ban Giám đốc');
    expect(snapshots[0].bold).toBe(true);
  });
```
