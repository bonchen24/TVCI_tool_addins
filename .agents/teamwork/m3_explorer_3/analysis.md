# Technical Analysis: One-Click Safe Auto-Fixer & Unit Test Suites (Milestone 3)

## 1. Executive Summary

Milestone 3 (`administrative-format-engine`) brings automated Vietnamese administrative document auditing and formatting correction to the TVCI Web Application.
This analysis provides the architectural specification for:
1. **One-Click Safe Auto-Fixer (`web_app/src/rules/auto-fixer.ts`)**: An atomic batch engine that translates `ValidationIssue[]` into ProseMirror formatting patches, updating font families, font sizes, alignments, indents, line spacing, and text marks (`bold`, `italic`) in a single editor transaction.
2. **Four Complete Unit Test Suites**:
   - `web_app/tests/unit/format-engine.test.ts`: Rule evaluator verification across 7 categories and 25+ rules.
   - `web_app/tests/unit/multi-profile.test.ts`: Multi-profile conformance (NĐ 30, TKV, IEMM, Party HD 05/2026).
   - `web_app/tests/unit/auto-fixer.test.ts`: Issue mapping, filtering, atomic application, and 100% health score convergence.
   - `web_app/tests/unit/audit-panel.test.tsx`: Sidebar UI, badge metrics, issue cards, and fix action triggers.

---

## 2. Architecture: One-Click Safe Auto-Fixer (`web_app/src/rules/auto-fixer.ts`)

### 2.1 Issue-to-Patch Mapping Matrix

The auto-fixer transforms fixable `ValidationIssue` objects into `FormattingPatch` objects:

| Issue Rule ID Pattern | Target Field | Fix Value Source | Vietnamese Legal Standard (NĐ 30/2020) |
|---|---|---|---|
| `*.fontName`, `*.font`, `FONT_NAME` | `patch.fontName` | `'Times New Roman'` | Times New Roman standard for all administrative text |
| `component.NATIONAL_EMBLEM.fontSize` | `patch.fontSize` | `12` | 12-13pt in hoa đứng |
| `component.MOTTO.fontSize` | `patch.fontSize` | `13` | 13-14pt chữ thường đứng đậm |
| `component.AGENCY_NAME.fontSize` | `patch.fontSize` | `12` (or `13`) | 12-13pt in hoa đứng |
| `component.NUMBER_SYMBOL.fontSize` | `patch.fontSize` | `13` | 13pt chữ thường đứng |
| `component.PLACE_DATE.fontSize` | `patch.fontSize` | `13` (or `14`) | 13-14pt chữ thường nghiêng |
| `component.DOCUMENT_TYPE.fontSize` | `patch.fontSize` | `14` (or `13`) | 13-14pt in hoa đứng đậm |
| `component.ABSTRACT.fontSize` | `patch.fontSize` | `12` (or `13`) | 12-13pt chữ thường đứng/nghiêng |
| `component.ADDRESSEE.fontSize` | `patch.fontSize` | `14` (or `13`) | 13-14pt chữ thường đứng |
| `component.RECIPIENTS.fontSize` | `patch.fontSize` | `12` (heading) / `11` (items) | Nơi nhận: 12pt nghiêng đậm; mục: 11pt đứng |
| `component.SIGNER_ROLE.fontSize` | `patch.fontSize` | `13` (or `14`) | 13-14pt in hoa đứng đậm |
| `signer.name.size` | `patch.fontSize` | `13` (or `14`) | 13-14pt chữ thường đứng đậm |
| `body.fontSize`, `FONT_SIZE` | `patch.fontSize` | `13` (or `14`) | 13-14pt chữ thường đứng |
| `component.NATIONAL_EMBLEM.alignment` | `patch.alignment` | `'Centered'` | Căn giữa |
| `component.MOTTO.alignment` | `patch.alignment` | `'Centered'` | Căn giữa |
| `component.AGENCY_NAME.alignment` | `patch.alignment` | `'Centered'` | Căn giữa |
| `component.NUMBER_SYMBOL.alignment` | `patch.alignment` | `'Centered'` | Căn giữa |
| `component.PLACE_DATE.alignment` | `patch.alignment` | `'Right'` | Căn phải |
| `component.DOCUMENT_TYPE.alignment` | `patch.alignment` | `'Centered'` | Căn giữa |
| `component.ABSTRACT.alignment` | `patch.alignment` | `'Centered'` | Căn giữa |
| `component.ADDRESSEE.alignment` | `patch.alignment` | `'Left'` (or `'Centered'` for CV) | Căn trái / căn giữa |
| `component.RECIPIENTS.alignment` | `patch.alignment` | `'Left'` | Căn trái |
| `component.SIGNER_ROLE.alignment` | `patch.alignment` | `'Centered'` | Căn giữa |
| `body.alignment`, `BODY_ALIGNMENT` | `patch.alignment` | `'Justified'` | Căn đều hai bên |
| `body.firstLineIndent*`, `BODY_INDENT` | `patch.firstLineIndentMm` | `10` (range 10-12.7mm) | Thụt đầu dòng 10mm hoặc 12.7mm |
| `body.lineSpacing*`, `BODY_LINE_SPACING` | `patch.lineSpacingMultiple` | `1.2` (range 1.2-1.5) | Giãn dòng 1.2-1.5 lines |
| `body.spaceBefore` | `patch.spaceBefore` | `2` (range 0-6pt) | Khoảng cách trước 2pt |
| `body.spaceAfter` | `patch.spaceAfter` | `2` (range 0-6pt) | Khoảng cách sau 2pt |
| `*.bold` | `patch.bold` | `Boolean(issue.fixValue ?? issue.expected)` | Áp dụng/gỡ mark bold |
| `*.italic` | `patch.italic` | `Boolean(issue.fixValue ?? issue.expected)` | Áp dụng/gỡ mark italic |

### 2.2 Target Node Resolution

`ValidationIssue` connects to editor nodes via:
1. `issue.paragraphIndex: number` (direct index).
2. `issue.targetId: string` matching `node-${index}` (produced by `tiptapDocToSnapshots`).
If an issue targets `"page"` or `"missing:*"`, it is non-node and excluded from paragraph patching.
```ts
export function resolveIssueNodeIndex(issue: ValidationIssue): number | null {
  if (typeof (issue as any).paragraphIndex === 'number') {
    return (issue as any).paragraphIndex;
  }
  if (issue.targetId) {
    const match = issue.targetId.match(/^node-(\d+)$/);
    if (match) return parseInt(match[1], 10);
  }
  return null;
}
```

### 2.3 Conflict Deduplication & Grouping

When a single paragraph triggers multiple violations (e.g., Arial font, 16pt size, left aligned), patches are grouped per `nodeIndex` into a merged `FormattingPatch` before dispatch:
```ts
export function groupFixableIssues(issues: ValidationIssue[]): Map<number, FormattingPatch> {
  const patchMap = new Map<number, FormattingPatch>();
  for (const issue of issues) {
    if (!issue.autoFixable) continue;
    const nodeIndex = resolveIssueNodeIndex(issue);
    if (nodeIndex === null) continue;
    const patch = issueToPatch(issue);
    if (!patch) continue;
    const existing = patchMap.get(nodeIndex) || {};
    patchMap.set(nodeIndex, { ...existing, ...patch });
  }
  return patchMap;
}
```

### 2.4 Atomic Single-Transaction Batch Execution

Instead of dispatching $N$ separate transactions for $N$ paragraphs (which clutters the undo history and triggers $N$ re-renders), `applySafeFixes` performs a single ProseMirror transaction:
1. Traverses `editor.state.doc.descendants()` once.
2. Updates node attributes via `tr.setNodeMarkup(pos, undefined, updates)`.
3. Updates inline text marks (`bold`, `italic`, `underline`) across the paragraph range `pos + 1` to `pos + node.nodeSize - 1`.
4. Dispatches `editor.view.dispatch(tr)` ONCE.
5. Returns `{ appliedCount: number, fixedNodeCount: number }`.

### 2.5 Text Mark Handling (`bold`, `italic`, `underline`)

In ProseMirror, paragraph styles (font family, size, alignment, indent, line spacing) are node attributes, whereas `bold` and `italic` are marks on text content inside the node.
`applySafeFixes` checks `patch.bold` and `patch.italic`:
- If `patch.bold === true`: `tr.addMark(from, to, schema.marks.bold.create())`.
- If `patch.bold === false`: `tr.removeMark(from, to, schema.marks.bold)`.
- If `patch.italic === true`: `tr.addMark(from, to, schema.marks.italic.create())`.
- If `patch.italic === false`: `tr.removeMark(from, to, schema.marks.italic)`.

### 2.6 Re-Audit Convergence (`healthScore === 100`)

When all fixable formatting issues are patched:
1. Mutated editor doc matches NĐ 30 typography standards.
2. `tiptapDocToSnapshots(editor.getJSON())` yields valid snapshots.
3. Re-evaluating via `evaluateDocumentRules` yields `healthScore === 100`, `failedRules === 0`, and `issueCount === 0`.

---

## 3. Adapter Upgrades & Edge Case Hardening

1. **`applyPatchToEditorNode` in `web_app/src/editor/tiptap-adapter.ts`**:
   - Currently handles node attributes (`fontFamily`, `fontSize`, `lineSpacing`, `spaceBefore`, `spaceAfter`, `firstLineIndentMm`, `textAlign`).
   - Must be extended with mark handling (`bold`, `italic`, `underline`) so single-item fixes also correctly apply/remove bold/italic styles.
2. **`TableHeader` Extension in Editor Initializations**:
   - `AdministrativeTable` requires `TableHeader` in the extension list along with `TableRow` and `AdministrativeTableCell`.
   - All tests and editor setups must include `TableHeader` to prevent ProseMirror `No node type or group 'tableHeader' found` error.
3. **`setParagraph` Command in `AdministrativeParagraph`**:
   - In `extensions.ts`, `AdministrativeParagraph` replaces `addCommands()`. It should include `...this.parent?.()` or explicitly define `setParagraph` so standard toolbar commands (`setParagraph()`) do not throw `TypeError`.

---

## 4. Design of Unit Test Suites

### Suite 1: `web_app/tests/unit/format-engine.test.ts`
Tests pure TypeScript rule evaluation across all 7 categories and 25+ rules:
- **Blank Document**: Empty document returns `isBlankDocument: true`, `healthScore: 0`, 0 applicable rules.
- **Header Components**:
  - `NATIONAL_EMBLEM`: Pass on Times New Roman, 12pt bold centered; Fail on Arial / 16pt / left.
  - `MOTTO`: Pass on Times New Roman, 13pt bold centered; Fail on wrong font/size.
  - `AGENCY_NAME`: Pass on Times New Roman, 12-13pt centered.
- **Symbol & Date**:
  - `NUMBER_SYMBOL`: Pass on 13pt centered; Fail when missing.
  - `PLACE_DATE`: Pass on 13-14pt italic right; Fail when left-aligned.
- **Title & Abstract**:
  - `DOCUMENT_TYPE`: Pass on 13-14pt bold centered.
  - `ABSTRACT`: Pass on 12-14pt bold/italic centered.
- **Recipients & Signer**:
  - `RECIPIENTS`: Pass on 12pt bold italic heading, 11pt items.
  - `SIGNER_ROLE` & `signer.name`: Pass on 13-14pt bold centered.
- **Body Formatting**:
  - Times New Roman, 13-14pt, Justified, indent 10-12.7mm, line spacing 1.2-1.5, spacing <= 6pt.
  - Individual violation tests for fontName, fontSize, alignment, indent, line spacing, spaceBefore, spaceAfter.
- **Page Setup**:
  - A4, Portrait, Top 20-25mm, Bottom 20-25mm, Left 30-35mm, Right 15-20mm.
- **Health Score Aggregation**:
  - Verifies formula: `healthScore = Math.round((passedRules / applicableRules) * 100)`.

### Suite 2: `web_app/tests/unit/multi-profile.test.ts`
Tests multi-profile configuration and dynamic switching:
- **Profile Registry**: 4 profiles registered (`ND30_TVCI`, `TKV`, `IEMM`, `DANG_05_HD_VPTW_2026`).
- **Profile Rules**:
  - `ND30_TVCI`: Requires National Emblem and Motto; legal basis ending `.`.
  - `DANG_05_HD_VPTW_2026` (Party): National Emblem and Motto are `NOT_APPLICABLE`; requires `PARTY_TITLE` ("ĐẢNG CỘNG SẢN VIỆT NAM"); legal basis ending `,`; Addressee alignment `Centered`.
  - `IEMM` & `TKV`: Specific font size rules for IEMM, SOE standards for TKV.
- **Dynamic Switching**: Evaluating identical document snapshots under `ND30_TVCI` vs `DANG_05_HD_VPTW_2026` produces profile-appropriate outcomes without reloading.

### Suite 3: `web_app/tests/unit/auto-fixer.test.ts`
Tests auto-fix logic and live editor mutation:
- **`issueToPatch`**: Correct mapping for font name, font size (body vs component), alignment, indent, line spacing, bold, italic.
- **Safe Fix Filtering**: Auto-fixable issues accepted; missing components (`autoFixable: false`) rejected.
- **Patch Merging**: Multi-issue nodes receive merged patch without property loss.
- **Live Tiptap Editor Auto-Fix & 100% Convergence**:
  - Initialize `Editor` with non-compliant administrative document (Arial, size 16, left-aligned, 0 indent, 1.8 line spacing).
  - Audit produces low health score (< 60%).
  - Apply `applySafeFixes(editor, issues)`.
  - Re-extract snapshots and re-audit: `healthScore === 100`, `issueCount === 0`.
- **Isolation**: Modifying paragraph $K$ leaves paragraphs $K-1$ and $K+1$ intact.
- **Boundary Clamping**: Clamps font size to [6, 72], line spacing to [1.0, 2.0], non-negative indents.

### Suite 4: `web_app/tests/unit/audit-panel.test.tsx`
Tests React Sidebar audit tab:
- **Tab Header & Score Badge**: Displays health score percentage and issue badge count.
- **Issue Card List**: Renders issue cards with severity colors, component tags, and messages.
- **Fix Button Actions**: Clicking "Sửa an toàn" triggers `onApplySafeFix`.
- **100% Compliant Empty State**: Displays green ShieldCheck icon and positive message when `healthScore === 100` and `issueCount === 0`.
- **Tab Switching & Sidebar Close**: Interacts cleanly with tab changes and close callbacks.

---

## 5. File Implementation Map

```
web_app/
├── src/
│   ├── rules/
│   │   ├── models.ts                 (shared rule models)
│   │   ├── profiles.ts               (ND30_TVCI, TKV, IEMM, DANG profiles)
│   │   ├── component-rules.ts        (component formatting rules)
│   │   ├── component-classifier.ts   (Vietnamese regex classifier)
│   │   ├── document-evaluator.ts     (25+ rules evaluator)
│   │   ├── auto-fixer.ts             (issueToPatch, groupFixableIssues, applySafeFixes)
│   │   └── fixer.ts                  (re-exports auto-fixer)
│   └── editor/
│       └── tiptap-adapter.ts         (applyPatchToEditorNode with mark support)
└── tests/
    └── unit/
        ├── format-engine.test.ts     (format rule engine tests)
        ├── multi-profile.test.ts     (multi-profile tests)
        ├── auto-fixer.test.ts        (auto-fixer & 100% health score tests)
        └── audit-panel.test.tsx      (Sidebar audit tab UI tests)
```
