# Analysis: Format Engine Nullish Text Guards & Unicode NFD Normalization

## 1. Problem Summary
Two critical defects in `web_app/src/rules/`:
1. `TypeError: Cannot read properties of null / undefined` when snapshot text nullish. Crashes audit engine.
2. 100% false-positive `MISSING` classification errors when Vietnamese text encoded in Unicode NFD (decomposed diacritics).

---

## 2. Root Cause 1: Nullish Snapshot Text

### 2.1 Failure Locations & Call Stack
1. `web_app/src/rules/auto-detect.service.ts`:
   - Line 14: `str.normalize('NFD')` in `removeTones(str: string)`.
   - Line 100: `const cleanP = removeTones(p)` inside `detectDocumentContext`.
   - Result: `TypeError: Cannot read properties of null (reading 'normalize')`.
2. `web_app/src/rules/component-classifier.ts`:
   - Line 46: `text.replace(/\s+/g, ' ').trim()` in `normalize(text: string)`.
   - Line 82: `const lines = paragraphs.map(normalize)` in `classifyDocumentComponents`.
   - Result: `TypeError: Cannot read properties of null (reading 'replace')`.
3. `web_app/src/rules/document-evaluator.ts`:
   - Line 77: `const rawTexts = paragraphSnapshots.map((p) => p.text)`. Propagates `null` into `detectDocumentContext` and `classifyDocumentComponents`.
   - Lines 107, 117: `const pText = paragraphSnapshots[i]?.text.trim() ?? ''`. If snapshot exists with `text: null`, `paragraphSnapshots[i]?.text` evaluates to `null`. Calling `.trim()` throws: `TypeError: Cannot read properties of null (reading 'trim')`.
   - Line 124: `(p, index) => !componentIndices.has(index) && p.text && p.text.trim().length > 0`. Throws if `p` nullish.
4. Secondary Validators (`recipients-validator.ts`, `addressee-validator.ts`, `legal-basis-validator.ts`):
   - `recipients-validator.ts:40,61`: `first?.text.trim()`, `current.text.trim()`. Throws on `null.trim()`.
   - `addressee-validator.ts:40,79,88,107`: `first?.text.trim()`, `current.text.trim()`, `line.text.trim()`. Throws on `null.trim()`.
   - `legal-basis-validator.ts:37,38,46`: `snapshot?.text.trim()`. Throws on `null.trim()`.

### 2.2 Remediation Specifications

#### A. `web_app/src/rules/component-classifier.ts`
Replace `normalize`:
```ts
// File: web_app/src/rules/component-classifier.ts
// Lines 45-47
function normalize(text: string | null | undefined): string {
  return String(text || '').normalize('NFC').replace(/\s+/g, ' ').trim();
}
```

Defensive guard in `classifyDocumentComponents`:
```ts
// File: web_app/src/rules/component-classifier.ts
// Lines 78-82
export function classifyDocumentComponents(
  paragraphs: (string | null | undefined)[],
  family: DocumentFamily
): ClassifiedComponent[] {
  if (!paragraphs || !Array.isArray(paragraphs)) return [];
  const lines = paragraphs.map(normalize);
  const result: ClassifiedComponent[] = [];
  let documentTypeIndex = -1;
```

#### B. `web_app/src/rules/auto-detect.service.ts`
Replace `removeTones`:
```ts
// File: web_app/src/rules/auto-detect.service.ts
// Lines 13-21
export function removeTones(str: string | null | undefined): string {
  return String(str || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .trim();
}
```

Defensive array check in `detectDocumentContext`:
```ts
// File: web_app/src/rules/auto-detect.service.ts
// Lines 34-35, 52-54
export function detectDocumentContext(paragraphs: (string | null | undefined)[]): AutoDetectResult {
  if (!paragraphs || !Array.isArray(paragraphs) || paragraphs.length === 0) {
    ...
  }

  const sample = paragraphs.slice(0, 20);
  const sampleFullText = sample.map((p) => String(p || '')).join('\n');
  const normalizedText = removeTones(sampleFullText);
```

#### C. `web_app/src/rules/document-evaluator.ts`
Line 60 (Blank check safety):
```ts
  const isBlankDocument =
    !paragraphSnapshots ||
    paragraphSnapshots.length === 0 ||
    paragraphSnapshots.every((p) => !p || !p.text || p.text.trim().length === 0);
```

Line 77 (Raw text mapping):
```ts
  const rawTexts = paragraphSnapshots.map((p) => p?.text ?? '');
```

Lines 107 & 117 (Recipients & Legal Basis loop trim guards):
```ts
  // Line 107
  const pText = (paragraphSnapshots[i]?.text ?? '').trim();

  // Line 117
  const pText = (paragraphSnapshots[i]?.text ?? '').trim();
```

Line 124 (Body paragraph filter):
```ts
  const bodyParagraphs = paragraphSnapshots.filter(
    (p, index) => !componentIndices.has(index) && p?.text && p.text.trim().length > 0
  );
```

Line 915 (Signer name search):
```ts
  const nameSnapshot = paragraphSnapshots
    .slice(signerIndex + 1, signerIndex + 4)
    .find((p) => p?.text && p.text.trim().length > 0);
```

#### D. Secondary Validators
`web_app/src/rules/recipients-validator.ts`:
```ts
// Line 40
const firstText = (first?.text ?? '').trim();
// Line 61
const text = (current?.text ?? '').trim();
```

`web_app/src/rules/addressee-validator.ts`:
```ts
// Line 40
const firstText = (first?.text ?? '').trim();
// Line 79
const text = (current?.text ?? '').trim();
// Line 88
if (!(line?.text ?? '').trim().endsWith(';')) {
// Line 107
const trimmed = (line?.text ?? '').trim();
```

`web_app/src/rules/legal-basis-validator.ts`:
```ts
// Line 36-39
const snapshot = paragraphs[index];
const text = (snapshot?.text ?? '').trim();
if (!text) continue;
if (!/^CĂN CỨ(?:\s|$)/i.test(text)) break;
```

---

## 3. Root Cause 2: Unicode NFD (Decomposed Diacritics) Normalization

### 3.1 Failure Mechanics
- Vietnamese input on macOS Telex, UniKey Composite, or DOCX XML decomposes accented vowels into base ASCII character + combining mark codepoints (`\u0300-\u036F`).
- In `web_app/src/rules/component-classifier.ts`:
  - `DOCUMENT_TYPES = new Set(['NGHỊ QUYẾT', 'QUYẾT ĐỊNH', ...])` uses NFC. `Set.has(nfd)` returns `false`.
  - `upper.includes('CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM')` uses NFC. `"CỘNG".normalize('NFD').includes("CỘNG")` is `false`.
  - Regex `/^ĐỘC LẬP\s*[-–—]\s*TỰ DO\s*[-–—]\s*HẠNH PHÚC$/i` fails on NFD.
  - Regex `/,\s*ngày\s+\d{1,2}\s+tháng\s+\d{1,2}\s+năm\s+\d{4}/i` fails on NFD.
  - `isSignerRole` regex `/^(T\/M|TM\.|KT\.|TL\.|TUQ\.|Q\.|PHÓ |GIÁM ĐỐC|...)/i` fails on NFD.
- Result: Classifier detects 0 elements. Evaluator emits false `MISSING` errors for all mandatory elements. Health score drops to near zero.

### 3.2 Remediation Specifications

#### A. Entry Normalization in `component-classifier.ts`
Calling `.normalize('NFC')` inside `normalize()` ensures all lines are precomposed NFC before any regex or string comparisons:
```ts
function normalize(text: string | null | undefined): string {
  return String(text || '').normalize('NFC').replace(/\s+/g, ' ').trim();
}
```

#### B. Fix `isUppercaseVietnamese`
Currently:
```ts
function isUppercaseVietnamese(text: string): boolean {
  const letters = text.replace(/[^A-Za-zÀ-ỹĐđ]/g, '');
  return letters.length >= 4 && text === text.toLocaleUpperCase('vi-VN');
}
```
Flaw: In NFD, combining diacritics (`\u0300-\u036F`) fall inside character class `[À-ỹ]` (`0x00C0` to `0x1EF9`), counting diacritic marks as letters.
Remediation:
```ts
function isUppercaseVietnamese(text: string | null | undefined): boolean {
  const nfc = String(text || '').normalize('NFC').trim();
  const letters = nfc.replace(/[^A-Za-zÀ-ỹĐđ]/g, '');
  return letters.length >= 4 && nfc === nfc.toLocaleUpperCase('vi-VN');
}
```

#### C. Harden `isPlaceDate` & `isSignerRole`
```ts
function isPlaceDate(text: string | null | undefined): boolean {
  const s = String(text || '').normalize('NFC');
  return (
    /,\s*ngày\s+\d{1,2}\s+tháng\s+\d{1,2}\s+năm\s+\d{4}/i.test(s) ||
    /,\s*ngày\s+.*\s+tháng\s+.*\s+năm\s+\d{4}/i.test(s)
  );
}

function isSignerRole(text: string | null | undefined): boolean {
  const s = String(text || '').normalize('NFC').trim();
  if (!isUppercaseVietnamese(s) || s.length > 80) return false;
  return /^(T\/M|TM\.|KT\.|TL\.|TUQ\.|Q\.|PHÓ |GIÁM ĐỐC|PHÓ GIÁM ĐỐC|CHỦ TỊCH|PHÓ CHỦ TỊCH|BÍ THƯ|PHÓ BÍ THƯ|CHÁNH VĂN PHÒNG|TRƯỞNG |PHÓ TRƯỞNG )/i.test(
    s
  );
}
```

---

## 4. Test Specifications for `web_app/tests/unit/format-engine.test.ts`

Add test suite at bottom of `web_app/tests/unit/format-engine.test.ts`:

```ts
  describe('Adversarial & Boundary Hardening: Nullish text & Unicode NFD diacritics', () => {
    it('handles snapshot arrays with null, undefined, empty, or whitespace-only text gracefully without throwing', () => {
      const malformedDoc: ParagraphSnapshot[] = [
        { id: 'node-null-1', text: null as any, fontName: 'Times New Roman', fontSize: 12 },
        { id: 'node-0', text: 'CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM', fontName: 'Times New Roman', fontSize: 12, bold: true, alignment: 'Centered' },
        { id: 'node-undef-1', text: undefined as any, fontName: 'Times New Roman', fontSize: 12 },
        { id: 'node-1', text: 'Độc lập - Tự do - Hạnh phúc', fontName: 'Times New Roman', fontSize: 13, bold: true, alignment: 'Centered' },
        { id: 'node-empty-1', text: '', fontName: 'Times New Roman', fontSize: 12 },
        { id: 'node-ws-1', text: '   \n  \t  ', fontName: 'Times New Roman', fontSize: 12 },
        { id: 'node-4', text: 'QUYẾT ĐỊNH', fontName: 'Times New Roman', fontSize: 14, bold: true, alignment: 'Centered' },
        { id: 'node-null-2', text: null as any, fontName: 'Times New Roman', fontSize: 12 },
      ];

      expect(() => {
        const summary = evaluateDocumentRules({
          profileId: 'NĐ30_TVCI',
          validationScope: 'document',
          paragraphSnapshots: malformedDoc,
          pageSnapshot: standardPage,
        });

        expect(summary.isBlankDocument).toBe(false);
        expect(typeof summary.healthScore).toBe('number');
        expect(summary.healthScore).toBeGreaterThan(0);
      }).not.toThrow();

      // All-nullish snapshot array evaluates to blank document
      const allNullishDoc: ParagraphSnapshot[] = [
        { id: 'n1', text: null as any, fontName: 'Times New Roman', fontSize: 13 },
        { id: 'n2', text: undefined as any, fontName: 'Times New Roman', fontSize: 13 },
        { id: 'n3', text: '   ', fontName: 'Times New Roman', fontSize: 13 },
      ];
      const blankSummary = evaluateDocumentRules({
        profileId: 'NĐ30_TVCI',
        validationScope: 'document',
        paragraphSnapshots: allNullishDoc,
        pageSnapshot: standardPage,
      });
      expect(blankSummary.isBlankDocument).toBe(true);
      expect(blankSummary.healthScore).toBe(0);
      expect(blankSummary.issues).toHaveLength(0);
    });

    it('correctly classifies and evaluates Vietnamese administrative components in Unicode NFD (Decomposed Diacritics)', () => {
      const nfdEmblem = 'CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM'.normalize('NFD');
      const nfdMotto = 'Độc lập - Tự do - Hạnh phúc'.normalize('NFD');
      const nfdSymbol = 'Số: 123/QĐ-TVCI'.normalize('NFD');
      const nfdPlaceDate = 'Hà Nội, ngày 29 tháng 09 năm 2026'.normalize('NFD');
      const nfdDocType = 'QUYẾT ĐỊNH'.normalize('NFD');
      const nfdAbstract = 'Về việc ban hành quy chế làm việc'.normalize('NFD');
      const nfdBody = 'Thực hiện quy định tại Nghị định 30/2020/NĐ-CP về công tác văn thư, toàn bộ các đơn vị áp dụng quy chuẩn thống nhất.'.normalize('NFD');
      const nfdSignerRole = 'GIÁM ĐỐC'.normalize('NFD');
      const nfdSignerName = 'Nguyễn Văn A'.normalize('NFD');
      const nfdRecipients = 'Nơi nhận:\n- Như trên;\n- Lưu: VT.'.normalize('NFD');

      // Verify that inputs are indeed decomposed NFD
      expect(nfdEmblem).not.toBe('CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM');
      expect(nfdMotto).not.toBe('Độc lập - Tự do - Hạnh phúc');

      const rawNfdParagraphs = [
        nfdEmblem,
        nfdMotto,
        nfdSymbol,
        nfdPlaceDate,
        nfdDocType,
        nfdAbstract,
        nfdBody,
        nfdSignerRole,
        nfdSignerName,
        nfdRecipients,
      ];
      const classified = classifyDocumentComponents(rawNfdParagraphs, 'ADMINISTRATIVE');

      expect(classified.some((c) => c.type === 'NATIONAL_EMBLEM')).toBe(true);
      expect(classified.some((c) => c.type === 'MOTTO')).toBe(true);
      expect(classified.some((c) => c.type === 'PLACE_DATE')).toBe(true);
      expect(classified.some((c) => c.type === 'DOCUMENT_TYPE')).toBe(true);
      expect(classified.some((c) => c.type === 'SIGNER_ROLE')).toBe(true);
      expect(classified.some((c) => c.type === 'RECIPIENTS')).toBe(true);

      const nfdDoc: ParagraphSnapshot[] = [
        { id: 'p0', text: nfdEmblem, fontName: 'Times New Roman', fontSize: 12, bold: true, alignment: 'Centered' },
        { id: 'p1', text: nfdMotto, fontName: 'Times New Roman', fontSize: 13, bold: true, alignment: 'Centered' },
        { id: 'p2', text: nfdSymbol, fontName: 'Times New Roman', fontSize: 13, alignment: 'Centered' },
        { id: 'p3', text: nfdPlaceDate, fontName: 'Times New Roman', fontSize: 13, italic: true, alignment: 'Right' },
        { id: 'p4', text: nfdDocType, fontName: 'Times New Roman', fontSize: 14, bold: true, alignment: 'Centered', spaceBefore: 6, spaceAfter: 6 },
        { id: 'p5', text: nfdAbstract, fontName: 'Times New Roman', fontSize: 13, bold: true, alignment: 'Centered', spaceBefore: 2, spaceAfter: 2 },
        { id: 'p6', text: nfdBody, fontName: 'Times New Roman', fontSize: 13, alignment: 'Justified', firstLineIndentMm: 10, lineSpacingMultiple: 1.2, spaceBefore: 2, spaceAfter: 2 },
        { id: 'p7', text: nfdSignerRole, fontName: 'Times New Roman', fontSize: 13, bold: true, alignment: 'Centered' },
        { id: 'p8', text: nfdSignerName, fontName: 'Times New Roman', fontSize: 13, bold: true, alignment: 'Centered' },
        { id: 'p9', text: nfdRecipients, fontName: 'Times New Roman', fontSize: 12, italic: true, alignment: 'Left' },
      ];

      const summary = evaluateDocumentRules({
        profileId: 'NĐ30_TVCI',
        validationScope: 'document',
        paragraphSnapshots: nfdDoc,
        pageSnapshot: standardPage,
      });

      expect(summary.isBlankDocument).toBe(false);
      expect(summary.healthScore).toBeGreaterThanOrEqual(90);

      const missingComponents = summary.issues
        .filter((i) => i.status === 'MISSING')
        .map((i) => i.ruleId);

      expect(missingComponents).not.toContain('component.NATIONAL_EMBLEM.missing');
      expect(missingComponents).not.toContain('component.MOTTO.missing');
      expect(missingComponents).not.toContain('component.DOCUMENT_TYPE.missing');
      expect(missingComponents).not.toContain('component.PLACE_DATE.missing');
      expect(missingComponents).not.toContain('signer.role.missing');
      expect(missingComponents).not.toContain('component.RECIPIENTS.missing');
    });
  });
```
