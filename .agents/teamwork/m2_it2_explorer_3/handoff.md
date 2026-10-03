# Handoff Report: Tab Characters & Indentation Remediation (`importer.ts`)

**Agent**: M2 Iteration 2 Explorer 3  
**Milestone**: M2 (`docx-interop-engine`)  
**Parent ID**: `c334c6db-8f15-4213-b7fc-7e7a2e6ba3a0`  
**Working Directory**: `e:\CODING\TVCI_word_addins\.agents\teamwork\m2_it2_explorer_3\`  
**Target Files**:
- `web_app/src/docx/importer.ts`
- `web_app/src/docx/types.ts`
- `web_app/tests/unit/docx-import.test.ts`

---

## 1. Observation

### Observation 1.1: Missing `<w:tab/>` and `<w:ptab/>` handling in `parseRun`
- File: `web_app/src/docx/importer.ts:166-185`
- Code:
  ```typescript
  166:   for (let i = 0; i < runEl.children.length; i++) {
  167:     const child = runEl.children[i];
  168:     if (child.localName === 't') {
             ...
  182:     } else if (child.localName === 'br') {
  183:       nodes.push({ type: 'hardBreak' });
  184:     }
  185:   }
  ```
- Direct observation: Loop only inspects `t` and `br`. Children with `localName === 'tab'` or `localName === 'ptab'` skipped. Tab stops in OpenXML discarded. Intra-run text concatenates without spacing. Standalone tab runs yield empty arrays.

### Observation 1.2: Unchecked `w:hanging` in `parseParagraph`
- File: `web_app/src/docx/importer.ts:266-276`
- Code:
  ```typescript
  266:     // Indent (w:ind)
  267:     const ind = findChild(pPr, 'ind');
  268:     if (ind) {
  269:       const firstLineVal = getAttribute(ind, 'firstLine');
  270:       if (firstLineVal) {
  271:         const parsedFirstLine = parseInt(firstLineVal, 10);
  272:         if (!isNaN(parsedFirstLine)) {
  273:           firstLineIndentMm = Number(((parsedFirstLine * 127) / 7200).toFixed(1));
  274:         }
  275:       }
  276:     }
  ```
- Direct observation: `getAttribute(ind, 'hanging')` never called. OpenXML hanging indent elements (`<w:ind w:left="720" w:hanging="720"/>`) ignored.

### Observation 1.3: Unwanted 10mm indent default on body paragraphs
- File: `web_app/src/docx/importer.ts:205`
- Code:
  ```typescript
  205:   let firstLineIndentMm = context.isInsideCell ? 0 : DEFAULT_FIRST_LINE_INDENT_MM;
  ```
- Direct observation: `DEFAULT_FIRST_LINE_INDENT_MM` is `10` (`styles.ts:104`). Body paragraphs without `<w:ind>` receive `10mm` indent even when meant to be flush left (`0mm`).
- Combination effect: When paragraph has `<w:ind w:hanging="720"/>`, `w:hanging` ignored (Obs 1.2) and `firstLineIndentMm` stays `10` (Obs 1.3). Outdent converted to indent.

---

## 2. Logic Chain

1. **Tab Loss**:
   - Run contains `<w:t>Kính gửi:</w:t><w:tab/><w:t>- Ban Giám đốc</w:t>`.
   - Iteration reaches `<w:tab/>` (`localName === 'tab'`).
   - Condition matches neither `child.localName === 't'` nor `child.localName === 'br'`.
   - Element dropped. Output: `[{ type: 'text', text: 'Kính gửi:' }, { type: 'text', text: '- Ban Giám đốc' }]`.
   - Text rendered as `"Kính gửi:- Ban Giám đốc"`.
   - Remediation: Append `{ type: 'text', text: '\t', marks: marks.length > 0 ? marks : undefined }` when `child.localName === 'tab' || child.localName === 'ptab'`.

2. **Hanging Indent Loss & Default Indent Inversion**:
   - ECMA-376 17.3.1.12 defines `w:hanging` as first line outdent relative to paragraph margin. `w:hanging` and `w:firstLine` mutually exclusive; `w:hanging` takes precedence if both exist.
   - Paragraph has `<w:ind w:left="720" w:hanging="720"/>` (twips 720 = 12.7mm).
   - `getAttribute(ind, 'firstLine')` is null.
   - `firstLineIndentMm` remains `DEFAULT_FIRST_LINE_INDENT_MM = 10`.
   - Paragraph assigned +10mm indent instead of -12.7mm hanging indent.
   - Body paragraph with NO `<w:ind>` assigned +10mm indent instead of 0mm.
   - Remediation:
     - Initialize `firstLineIndentMm = 0;` (lines 205).
     - Inspect `getAttribute(ind, 'hanging')`. If present: `hangingIndentMm = Number(((parsedHanging * 127) / 7200).toFixed(1)); firstLineIndentMm = -hangingIndentMm;`.
     - Inspect `getAttribute(ind, 'firstLine')`. If present: `firstLineIndentMm = Number(((parsedFirstLine * 127) / 7200).toFixed(1));`.

---

## 3. Caveats

- **Scope Boundary**: Analysis and specs target `importer.ts`, `types.ts`, and `docx-import.test.ts`. Exporter (`exporter.ts`) and CSS editor extension (`extensions.ts`) are separate modules. In `extensions.ts:137`, negative `text-indent` for visual rendering is currently clamped to `0mm` in web editor DOM view; separate ticket needed if visual hanging indent needed in live Tiptap canvas.
- **Character Units**: `w:firstLineChars` and `w:hangingChars` (Asian typography) not parsed; standard Vietnamese administrative documents use twips (`w:firstLine`, `w:hanging`, `w:left`).
- **Read-Only Explorer**: Production code files in `web_app/src/` NOT modified directly. Implementation reserved for builder / worker agent.

---

## 4. Conclusion

Remediation plan ready for implementation:
1. In `web_app/src/docx/importer.ts`:
   - Line 10: remove unused import `DEFAULT_FIRST_LINE_INDENT_MM`.
   - Line 184: add `else if (child.localName === 'tab' || child.localName === 'ptab') { nodes.push({ type: 'text', text: '\t', marks: marks.length > 0 ? marks : undefined }); }`.
   - Line 205: replace with `let firstLineIndentMm = 0; let hangingIndentMm: number | undefined;`.
   - Line 267: check `hangingVal` and `firstLineVal`. Compute negative `firstLineIndentMm` and positive `hangingIndentMm`.
   - Line 374: include `...(hangingIndentMm !== undefined ? { hangingIndentMm } : {})` in paragraph `attrs`.
2. In `web_app/src/docx/types.ts`:
   - Add optional `hangingIndentMm?: number;` to `AdministrativeParagraphAttributes`.
3. In `web_app/tests/unit/docx-import.test.ts`:
   - Add test suite with 5 unit tests covering intra-run tabs, standalone tab runs, hanging indents (negative indent & hanging offset), flush-left default (0mm), and table/heading indent isolation.

---

## 5. Verification Method

1. **Static Inspection**:
   - Check `importer.ts` line 184 contains tab handling.
   - Check `importer.ts` line 205 sets `firstLineIndentMm = 0`.
   - Check `importer.ts` line 267 inspects `hangingVal`.
2. **Automated Unit Testing**:
   Run Vitest test suite on web application:
   ```powershell
   npm run test
   ```
   or target unit tests directly:
   ```powershell
   npx vitest run tests/unit/docx-import.test.ts
   ```
3. **Invalidation Conditions**:
   - Any test expecting body paragraph without `<w:ind>` to receive 10mm fails (invalid: ND30 requires audit auto-fix to add indent, importer must faithfully extract actual file content).
   - Any test expecting tab stops in runs fails if tabs omitted.
