# Handoff Report: Remediation for DOCX Importer Fallback Handling

**Agent**: M2 Iteration 2 Explorer 1  
**Milestone**: M2 (`docx-interop-engine`)  
**Type**: Hard Handoff  
**Date**: 2026-09-29  

---

## 1. Observation

1. **Unprotected `mammoth.convertToHtml` call**:
   In `web_app/src/docx/importer.ts`, lines 622-641:
   ```typescript
   export async function parseDocxWithMammoth(
     arrayBuffer: ArrayBuffer,
     _options: DocxImportOptions = {}
   ): Promise<JSONContent> {
     const result = await mammoth.convertToHtml(
       { arrayBuffer },
       {
         styleMap: [ ... ],
         ignoreEmptyParagraphs: false,
       }
     );
   ```
   No `try...catch` block surrounds `mammoth.convertToHtml`. When `arrayBuffer` is empty, truncated, non-zip binary, or missing `word/document.xml`, Mammoth throws an unhandled Promise rejection (`Error: Can't find end of central directory` or `Error: Could not find main document part`).

2. **Uncaught Fallback Call in `importDocx`**:
   In `web_app/src/docx/importer.ts`, lines 827-845:
   ```typescript
   export async function importDocx(
     input: ArrayBuffer | Uint8Array,
     options: DocxImportOptions = {}
   ): Promise<JSONContent> {
     const arrayBuffer = normalizeBuffer(input);

     if (!options.forceFallback) {
       try {
         const doc = await parseDocxWithOpenXml(arrayBuffer, options);
         if (doc && Array.isArray(doc.content) && doc.content.length > 0) {
           return doc;
         }
       } catch {
         // Primary OpenXML parsing failed, fallback gracefully to Mammoth
       }
     }

     return await parseDocxWithMammoth(arrayBuffer, options);
   }
   ```
   Line 844 is outside any `try...catch` block. The inner `try...catch` only catches errors from `parseDocxWithOpenXml`. When `parseDocxWithOpenXml` fails on a corrupted or empty buffer and falls back to `parseDocxWithMammoth`, the error from Mammoth escapes unhandled, crashing caller applications (e.g. `web_app/app/page.tsx` line 89).

3. **Existing Test Coverage Gap**:
   In `web_app/tests/unit/docx-import.test.ts`, lines 247-256 only contain a single test with a 6-byte truncated buffer:
   ```typescript
   it('falls back gracefully to Mammoth or default structure when XML is damaged', async () => {
     const corruptedBuffer = new Uint8Array([0x50, 0x4b, 0x03, 0x04, 0x00, 0x00]).buffer;
     const result = await importDocx(corruptedBuffer);
     expect(result.type).toBe('doc');
     expect(Array.isArray(result.content)).toBe(true);
   });
   ```
   There are no unit tests for:
   - Zero-byte `ArrayBuffer` (`new ArrayBuffer(0)`)
   - Zero-byte `Uint8Array` (`new Uint8Array(0)`)
   - Arbitrary non-zip binary (`[0x00, 0xff, 0x42, ...]`)
   - `options.forceFallback: true` with corrupted buffer
   - Zip archives lacking `word/document.xml`
   - Direct calls to `parseDocxWithMammoth`
   - Reusable `createDefaultDocument` AST validator

---

## 2. Logic Chain

1. **Chain from Observation 1 to crash**:
   - `mammoth.convertToHtml` is an asynchronous external library function that requires a valid zip archive containing WordprocessingML parts.
   - When given zero bytes, truncated zip streams, or invalid file types, Mammoth's underlying unzipper immediately rejects its returned Promise.
   - Because `parseDocxWithMammoth` lacks `try...catch`, the rejection immediately bubbles up through `parseDocxWithMammoth`.

2. **Chain from Observation 2 to unhandled rejection in `importDocx`**:
   - In `importDocx`, `parseDocxWithOpenXml` fails on any invalid archive and enters the catch block at line 840.
   - Execution proceeds to line 844: `return await parseDocxWithMammoth(arrayBuffer, options);`.
   - The rejection from `parseDocxWithMammoth` is not caught by `importDocx`.
   - Consequently, `importDocx` rejects its Promise. Any UI component calling `await importDocx(...)` (such as `web_app/app/page.tsx`) encounters a runtime exception unless specially guarded.

3. **Chain from Observations 1 & 2 to Remediation**:
   - Defining a canonical `createDefaultDocument(options?: { withAdministrativeLayout?: boolean })` helper provides a clean, guaranteed valid Tiptap AST (`type: 'doc'`, standard ND30 paragraph attributes).
   - Wrapping `mammoth.convertToHtml` and subsequent DOM processing inside `parseDocxWithMammoth` in `try...catch` and returning `createDefaultDocument()` on error ensures `parseDocxWithMammoth` never throws.
   - Adding a top-level `try...catch` in `importDocx` and a fast short-circuit for `arrayBuffer.byteLength === 0` guarantees that `importDocx` never throws an unhandled rejection under any input condition.

---

## 3. Caveats

1. **Table classification & hanging indents**: Challenger 1 identified two secondary issues (false positive 2-column table classification when right cell contains `"ngày"` or `"trưởng"`, and omission of `<w:tab/>` and `<w:hanging>`). This investigation focused strictly on fallback error handling in `importer.ts` as specified by the prompt objective. Those secondary layout refinements should be handled in a separate or coordinated worker task.
2. **Terminal execution**: Terminal commands (`npm test`) were not run directly due to interactive permission timeouts. All findings were verified through static code inspection, dependency behavior analysis of Mammoth v1.8.0, and AST schema modeling.

---

## 4. Conclusion

The fallback error handling vulnerability reported by Challenger 1 is confirmed. The root cause is the absence of `try...catch` protection around `mammoth.convertToHtml` and the unprotected fallback call at `web_app/src/docx/importer.ts:844`.

The remediation is fully specified in `analysis.md`:
1. Export `createDefaultDocument` in `importer.ts` producing valid ND30 AST (with optional 2-column administrative layout).
2. Wrap `mammoth.convertToHtml` and DOM extraction in `parseDocxWithMammoth` in `try...catch`.
3. Wrap `importDocx` in top-level `try...catch` with an immediate zero-length buffer guard.
4. Add 9 comprehensive unit tests in `web_app/tests/unit/docx-import.test.ts` covering 0-byte buffers, truncated headers, arbitrary binary, forceFallback mode, missing `word/document.xml`, and direct Mammoth calls.

---

## 5. Verification Method

1. **Inspect Code**:
   - Verify `createDefaultDocument` is defined and exported in `web_app/src/docx/importer.ts`.
   - Verify `parseDocxWithMammoth` wraps `mammoth.convertToHtml` in `try...catch`.
   - Verify `importDocx` has top-level `try...catch` returning `createDefaultDocument()`.
2. **Execute Tests**:
   ```bash
   cd e:\CODING\TVCI_word_addins\web_app
   npm test -- tests/unit/docx-import.test.ts
   npm test -- tests/unit/docx-roundtrip.test.ts
   npm run typecheck
   ```
3. **Invalidation Conditions**:
   - This handoff is invalidated if `importDocx(new ArrayBuffer(0))` throws an uncaught error or rejection instead of resolving to a valid `{ type: 'doc', content: [...] }`.
