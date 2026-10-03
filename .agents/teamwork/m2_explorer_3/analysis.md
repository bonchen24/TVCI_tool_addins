# Analysis: Template Fidelity, Roundtrip Verification Criteria & Test Suite Design

## 1. Real Template OpenXML Examination

### 1.1 Analyzed Artifacts
- `templates/tvci-cong-van-template.docx` (Official dispatch template, 23,853 bytes)
- `templates/tvci-thong-bao-template.docx` (Official notice template, 26,027 bytes)
- `templates/sample-template.docx` / `templates/tvci-sample.docx`
- `tbl.xml` / `iemm_tbl.xml` (Extracted OpenXML header table components)
- `qa/template-header.node.test.ts` (Automated OpenXML assertions across catalog)
- `scripts/add-template-form-content-controls.py` & `scripts/normalize-final-catalog.py`

### 1.2 Package Architecture & Relationships
A standard TVCI `.docx` file is a ZIP archive containing:
```
[Content_Types].xml
_rels/
  .rels
word/
  document.xml
  styles.xml
  settings.xml
  fontTable.xml
  webSettings.xml
  _rels/
    document.xml.rels
```

- `[Content_Types].xml`: Declares MIME overrides:
  - `application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml` for `word/document.xml`.
  - `application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml` for `word/styles.xml`.
- `word/_rels/document.xml.rels`: Explicit relationship IDs (`r:id="rId1"`, etc.) linking `document.xml` to `styles.xml` and optional drawing targets.

### 1.3 Exact OpenXML Elements in Standard TVCI Documents

#### A. Header Table (Bảng Quốc hiệu & Cơ quan ban hành)
- **Container**: `<w:tbl>`
- **Properties**:
  ```xml
  <w:tblPr>
    <w:tblW w:w="9354" w:type="dxa"/>
    <w:jc w:val="left"/>
    <w:tblLayout w:type="fixed"/>
    <w:tblInd w:w="142" w:type="dxa"/>
    <w:tblDescription w:val="TVCI_HEADER_EXT_R5"/>
  </w:tblPr>
  ```
- **Grid definition**:
  ```xml
  <w:tblGrid>
    <w:gridCol w:w="5074"/>
    <w:gridCol w:w="4280"/>
  </w:tblGrid>
  ```
  *(Left column width: 5074 dxa (~54.2%), Right column width: 4280 dxa (~45.8%))*.
- **Row & Cells**:
  ```xml
  <w:tr>
    <w:tc>
      <w:tcPr>
        <w:tcW w:w="5074" w:type="dxa"/>
        <w:tcBorders>
          <w:top w:val="nil"/>
          <w:left w:val="nil"/>
          <w:bottom w:val="nil"/>
          <w:right w:val="nil"/>
        </w:tcBorders>
        <w:vAlign w:val="center"/>
      </w:tcPr>
      <!-- Left column content: Agency, Number, Abstract -->
    </w:tc>
    <w:tc>
      <w:tcPr>
        <w:tcW w:w="4280" w:type="dxa"/>
        <w:tcBorders>
          <w:top w:val="nil"/>
          <w:left w:val="nil"/>
          <w:bottom w:val="nil"/>
          <w:right w:val="nil"/>
        </w:tcBorders>
        <w:vAlign w:val="center"/>
      </w:tcPr>
      <!-- Right column content: Emblem, Motto, Date -->
    </w:tc>
  </w:tr>
  ```

#### B. Agency Name (Cơ quan ban hành - Left Cell)
- Superior Agency:
  ```xml
  <w:p>
    <w:pPr>
      <w:spacing w:after="0" w:line="240" w:lineRule="auto"/>
      <w:jc w:val="center"/>
    </w:pPr>
    <w:r>
      <w:rPr>
        <w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/>
        <w:sz w:val="24"/> <!-- 12pt -->
      </w:rPr>
      <w:t>TẬP ĐOÀN CÔNG NGHIỆP THAN - KHOÁNG SẢN VIỆT NAM</w:t>
    </w:r>
  </w:p>
  ```
- Subordinate / Direct Issuing Agency:
  ```xml
  <w:p>
    <w:pPr>
      <w:spacing w:after="0" w:line="240" w:lineRule="auto"/>
      <w:jc w:val="center"/>
    </w:pPr>
    <w:r>
      <w:rPr>
        <w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/>
        <w:b/>
        <w:sz w:val="24"/> <!-- 12pt bold -->
      </w:rPr>
      <w:t>VIỆN CƠ KHÍ NĂNG LƯỢNG VÀ MỎ - VINACOMIN</w:t>
    </w:r>
  </w:p>
  ```
- Decorative Rule under Agency (Kẻ dưới cơ quan ban hành):
  - In DrawingML: `<w:drawing><wp:inline>...<a:prstGeom prst="rect"/><a:solidFill><a:srgbClr val="000000"/></a:solidFill>...</wp:inline></w:drawing>`
  - Or in Structured Document Tag: `<w:sdt><w:sdtPr><w:tag w:val="TVCI_HRULE:AGENCY"/></w:sdtPr><w:sdtContent>...</w:sdtContent></w:sdt>`
  - Or VML: `<w:pict><v:line id="agency-rule" style="width:220pt;height:0pt;" strokecolor="#000000" strokeweight="0.5pt"/></w:pict>`

#### C. National Emblem & Motto (Quốc hiệu & Tiêu ngữ - Right Cell)
- National Emblem (Quốc hiệu):
  ```xml
  <w:p>
    <w:pPr>
      <w:spacing w:before="0" w:after="0" w:line="240" w:lineRule="auto"/>
      <w:jc w:val="center"/>
    </w:pPr>
    <w:r>
      <w:rPr>
        <w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/>
        <w:b/>
        <w:sz w:val="26"/> <!-- 13pt bold uppercase -->
      </w:rPr>
      <w:t>CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</w:t>
    </w:r>
  </w:p>
  ```
- National Motto (Tiêu ngữ):
  ```xml
  <w:p>
    <w:pPr>
      <w:spacing w:before="0" w:after="0" w:line="240" w:lineRule="auto"/>
      <w:jc w:val="center"/>
    </w:pPr>
    <w:r>
      <w:rPr>
        <w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/>
        <w:b/>
        <w:sz w:val="26"/> <!-- 13pt or 14pt (sz 28) bold titlecase -->
      </w:rPr>
      <w:t>Độc lập - Tự do - Hạnh phúc</w:t>
    </w:r>
  </w:p>
  ```
- Centered Motto Rule:
  ```xml
  <w:sdt>
    <w:sdtPr>
      <w:tag w:val="TVCI_HRULE:NATIONAL_MOTTO"/>
    </w:sdtPr>
    <w:sdtContent>
      <w:p>
        <w:pPr>
          <w:spacing w:before="0" w:after="0" w:line="20" w:lineRule="exact"/>
          <w:jc w:val="center"/>
        </w:pPr>
        <w:r>
          <w:drawing>
            <wp:anchor distT="0" distB="0" distL="0" distR="0" simplePos="0" relativeHeight="251659265" behindDoc="0" locked="0" layoutInCell="1" allowOverlap="1">
              <wp:extent cx="2000250" cy="6350"/>
              <wp:docPr id="172" name="National motto rule"/>
              <a:graphic>
                <a:graphicData uri="http://schemas.microsoft.com/office/word/2010/wordprocessingShape">
                  <wps:wsp>
                    <wps:spPr>
                      <a:xfrm><a:off x="0" y="0"/><a:ext cx="2000250" cy="6350"/></a:xfrm>
                      <a:prstGeom prst="line"><a:avLst/></a:prstGeom>
                      <a:ln w="6350"><a:solidFill><a:srgbClr val="000000"/></a:solidFill><a:prstDash val="solid"/></a:ln>
                    </wps:spPr>
                  </wps:wsp>
                </a:graphicData>
              </a:graphic>
            </wp:anchor>
          </w:drawing>
        </w:r>
      </w:p>
    </w:sdtContent>
  </w:sdt>
  ```
- Location & Date:
  ```xml
  <w:sdt>
    <w:sdtPr><w:tag w:val="NGAY_BAN_HANH"/></w:sdtPr>
    <w:sdtContent>
      <w:p>
        <w:pPr>
          <w:spacing w:before="40" w:after="0" w:line="240" w:lineRule="auto"/>
          <w:jc w:val="right"/>
        </w:pPr>
        <w:r>
          <w:rPr>
            <w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/>
            <w:i/>
            <w:sz w:val="26"/> <!-- 13pt italic -->
          </w:rPr>
          <w:t>Hà Nội, ngày 29 tháng 9 năm 2026</w:t>
        </w:r>
      </w:p>
    </w:sdtContent>
  </w:sdt>
  ```

#### D. Reference Number & Subject (Số ký hiệu & Trích yếu)
- Reference Number (Left cell, below agency rule):
  ```xml
  <w:p>
    <w:pPr>
      <w:spacing w:before="40" w:after="0" w:line="240" w:lineRule="auto"/>
      <w:jc w:val="center"/>
    </w:pPr>
    <w:r>
      <w:rPr><w:sz w:val="24"/></w:rPr>
      <w:t>Số: </w:t>
    </w:r>
    <w:sdt>
      <w:sdtPr><w:tag w:val="SO_KY_HIEU"/></w:sdtPr>
      <w:sdtContent>
        <w:r>
          <w:rPr><w:sz w:val="24"/></w:rPr>
          <w:t>    /VCNM-TTTN</w:t>
        </w:r>
      </w:sdtContent>
    </w:sdt>
  </w:p>
  ```
- Subject (Trích yếu):
  - For Công văn: In left cell below Số:
    ```xml
    <w:p>
      <w:pPr>
        <w:spacing w:before="20" w:after="0" w:line="240" w:lineRule="auto"/>
        <w:jc w:val="center"/>
      </w:pPr>
      <w:sdt>
        <w:sdtPr><w:tag w:val="TRICH_YEU"/></w:sdtPr>
        <w:sdtContent>
          <w:r>
            <w:rPr><w:i/><w:sz w:val="24"/></w:rPr>
            <w:t>V/v kiểm định kỹ thuật an toàn hệ thống thiết bị mỏ</w:t>
          </w:r>
        </w:sdtContent>
      </w:sdt>
    </w:p>
    ```
  - For Thông báo / Quyết định: Standalone centered title paragraph in body:
    ```xml
    <w:p>
      <w:pPr>
        <w:spacing w:before="240" w:after="120"/>
        <w:jc w:val="center"/>
      </w:pPr>
      <w:r>
        <w:rPr><w:b/><w:sz w:val="28"/></w:rPr> <!-- 14pt bold -->
        <w:t>THÔNG BÁO</w:t>
      </w:r>
    </w:p>
    ```

#### E. Body Paragraphs (Nội dung văn bản)
- Addressee (Kính gửi):
  ```xml
  <w:p>
    <w:pPr>
      <w:spacing w:before="120" w:after="60" w:line="288" w:lineRule="auto"/>
      <w:jc w:val="left"/>
    </w:pPr>
    <w:r>
      <w:rPr><w:b/><w:sz w:val="26"/></w:rPr> <!-- 13pt bold -->
      <w:t xml:space="preserve">Kính gửi: </w:t>
    </w:r>
    <w:r>
      <w:rPr><w:sz w:val="26"/></w:rPr>
      <w:t>Tập đoàn Công nghiệp Than - Khoáng sản Việt Nam</w:t>
    </w:r>
  </w:p>
  ```
- Standard Body Paragraph:
  ```xml
  <w:p>
    <w:pPr>
      <w:spacing w:before="40" w:after="40" w:line="288" w:lineRule="auto"/> <!-- lineSpacing 1.2, spaceBefore/After 2pt -->
      <w:ind w:firstLine="567"/> <!-- 10mm indent (567 dxa) -->
      <w:jc w:val="both"/> <!-- Justified alignment -->
    </w:pPr>
    <w:r>
      <w:rPr>
        <w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/>
        <w:sz w:val="26"/> <!-- 13pt -->
      </w:rPr>
      <w:t>Thực hiện Nghị định số 30/2020/NĐ-CP của Chính phủ...</w:t>
    </w:r>
  </w:p>
  ```

#### F. Signature Block & Recipients (Nơi nhận & Chữ ký - Footer Table)
- **Container**: `<w:tbl>` with 2 borderless columns (`attrs: { borderless: true, columnRatio: '50-50' }`).
- **Left Cell** (Recipients / Nơi nhận):
  - Heading:
    ```xml
    <w:p>
      <w:pPr><w:jc w:val="left"/></w:pPr>
      <w:r><w:rPr><w:b/><w:i/><w:sz w:val="24"/></w:rPr><w:t>Nơi nhận:</w:t></w:r>
    </w:p>
    ```
  - Items & Archive:
    ```xml
    <w:p>
      <w:pPr><w:spacing w:before="0" w:after="0" w:line="240" w:lineRule="auto"/></w:pPr>
      <w:r><w:rPr><w:sz w:val="22"/></w:rPr><w:t>- Như trên;</w:t></w:r>
    </w:p>
    <w:p>
      <w:pPr><w:spacing w:before="0" w:after="0" w:line="240" w:lineRule="auto"/></w:pPr>
      <w:r><w:rPr><w:sz w:val="22"/></w:rPr><w:t>- Lưu: VT, TTTN.</w:t></w:r>
    </w:p>
    ```
- **Right Cell** (Signer / Quyền hạn & Chức vụ):
  - Signer Role:
    ```xml
    <w:p>
      <w:pPr><w:jc w:val="center"/><w:spacing w:before="0" w:after="0"/></w:pPr>
      <w:r><w:rPr><w:b/><w:sz w:val="26"/></w:rPr><w:t>KT. VIỆN TRƯỞNG</w:t></w:r>
    </w:p>
    <w:p>
      <w:pPr><w:jc w:val="center"/><w:spacing w:before="40" w:after="0"/></w:pPr>
      <w:r><w:rPr><w:b/><w:sz w:val="26"/></w:rPr><w:t>PHÓ VIỆN TRƯỞNG</w:t></w:r>
    </w:p>
    ```
  - Spacer for signature: 3-4 blank paragraphs or spacing before.
  - Signer Full Name:
    ```xml
    <w:p>
      <w:pPr><w:jc w:val="center"/></w:pPr>
      <w:r><w:rPr><w:b/><w:sz w:val="26"/></w:rPr><w:t>TS. Nguyễn Văn A</w:t></w:r>
    </w:p>
    ```

---

## 2. Roundtrip Fidelity Criteria Specification

Pipeline: `DOCX (input binary) -> importDocx -> Tiptap JSON -> exportDocx -> DOCX (output binary)`

### 2.1 Invariant Criteria (100% Exact Match)

| Component | Preservation Requirement | Verification Metric |
|---|---|---|
| **Text Content** | 100% exact text string preservation across every paragraph, table cell, and inline run. | `norm(textIn) === norm(textOut)` using Unicode NFC. Zero character loss. |
| **Document Sequence** | Paragraph and table visual reading order strictly retained. | Array index mapping between input AST nodes and re-imported AST nodes. |
| **Table Hierarchy** | Row count, column count, and cell child elements structure retained 100%. | `rows.length` & `cells.length` strictly identical; cell contents nested correctly. |
| **Table Borderless** | Administrative tables must retain `borderless: true` / `<w:tcBorders><w:val="nil"/></w:tcBorders>`. | Zero borders rendered in Word or OpenXML XML. |
| **Vietnamese Diacritics** | All 134 Vietnamese vowel-tone combinations preserved without mojibake. | Byte encoding verification: UTF-8 clean. |

### 2.2 Typographical Match Criteria & Tolerances

| Attribute | OpenXML Input | Tiptap JSON Attr | OpenXML Output | Allowed Tolerance |
|---|---|---|---|---|
| **Font Family** | `<w:rFonts w:ascii="..." />` | `fontFamily: 'Times New Roman'` | `<w:rFonts w:ascii="Times New Roman"/>` | 0 (Must be exact "Times New Roman") |
| **Font Size** | `<w:sz w:val="26" />` (half-points) | `fontSize: 13` (pt) | `<w:sz w:val="26" />` | ≤ 0.5pt (1 half-point) |
| **Alignment** | `<w:jc w:val="center\|both\|left\|right"/>` | `textAlign: 'center'\|'justify'\|'left'\|'right'` | Exact match to input | Exact match (0 tolerance) |
| **Line Spacing** | `<w:line="288" w:lineRule="auto"/>` | `lineSpacing: 1.2` | `<w:line="288" />` | ≤ 0.05 multiplier |
| **Space Before** | `<w:spacing w:before="40"/>` (dxa) | `spaceBefore: 2` (pt) | `<w:spacing w:before="40"/>` | ≤ 1pt (20 dxa) |
| **Space After** | `<w:spacing w:after="40"/>` (dxa) | `spaceAfter: 2` (pt) | `<w:spacing w:after="40"/>` | ≤ 1pt (20 dxa) |
| **First Line Indent**| `<w:ind w:firstLine="567"/>` (dxa) | `firstLineIndentMm: 10` | `<w:ind w:firstLine="567"/>` | ≤ 0.5mm (28 dxa) |
| **Page Dimensions** | `w:w="11906" w:h="16838"` (dxa) | A4 (210mm x 297mm) | `w:w="11906" w:h="16838"` | ≤ 1mm |
| **Page Margins** | Top 20mm (1134), Left 30mm (1701) | `margins: {topMm:20, leftMm:30}` | Exact dxa match | ≤ 0.5mm |

### 2.3 Zero-Corruption Guarantee
To prevent Microsoft Word "The file is corrupt and cannot be opened" dialogs:
1. **Valid ZIP Archive Structure**:
   - Header magic signature: `0x50, 0x4B, 0x03, 0x04` (Local file header), `0x50, 0x4B, 0x01, 0x02` (Central directory header).
   - Deflate compression valid; CRC-32 match.
2. **Schema Conformity**:
   - Strictly conform to ECMA-376 / ISO 29500 WordprocessingML namespace:
     `http://schemas.openxmlformats.org/wordprocessingml/2006/main`.
   - Element order inside `<w:pPr>`: strictly follow XSD order (`pStyle` -> `spacing` -> `ind` -> `jc` -> `rPr`).
   - Every opened XML tag must be properly closed; no unbalanced closing tags.
   - All text content XML-escaped (`&` -> `&amp;`, `<` -> `&lt;`, `>` -> `&gt;`).
3. **Required Parts**:
   - `[Content_Types].xml` must declare document and relationship types.
   - `_rels/.rels` must link `rId1` to `word/document.xml`.
   - `word/styles.xml` must define base styles (`Normal`, `Default Paragraph Font`, `Table Grid`).

---

## 3. Test Suite Design

### 3.1 `web_app/tests/unit/docx-import.test.ts`
Tests parsing OpenXML elements into Tiptap JSON AST:
- **Test Group 1: Paragraph & Run Extraction**:
  - Extracts text from single run and multi-run paragraphs.
  - Extracts inline marks: `bold` (`<w:b/>`), `italic` (`<w:i/>`), `underline` (`<w:u/>`).
  - Converts `<w:sz w:val="26"/>` (26 half-points) into `fontSize: 13`.
  - Normalizes font name: extracts `"Times New Roman"` from `<w:rFonts w:ascii="Times New Roman"/>`.
  - Maps `<w:jc w:val="both"/>` to `'justify'`, `<w:jc w:val="center"/>` to `'center'`.
- **Test Group 2: Spacing & Indentation**:
  - Maps `<w:spacing w:line="288" w:lineRule="auto"/>` to `lineSpacing: 1.2`.
  - Maps `<w:spacing w:before="40" w:after="40"/>` to `spaceBefore: 2, spaceAfter: 2`.
  - Converts `<w:ind w:firstLine="567"/>` to `firstLineIndentMm: 10`.
- **Test Group 3: Table Structure & Attributes**:
  - Parses 2-column header table with `cellType: 'header-left'` and `cellType: 'header-right'`.
  - Detects borderless table when borders are `<w:val="nil"/>` or omitted.
  - Computes `columnRatios: [0.45, 0.55]` from cell `w:tcW`.
- **Test Group 4: Administrative Decorative Rules & SDT**:
  - Converts Motto line drawing / `<w:sdt><w:tag w:val="TVCI_HRULE:NATIONAL_MOTTO"/></w:sdt>` into `adminRule` node (`kind: 'MOTTO'`).
  - Extracts text inside `<w:sdt>` (Content Controls) without tag corruption.
- **Test Group 5: Edge Cases & Error Recovery**:
  - Handles empty paragraphs (`<w:p/>`) cleanly without throwing.
  - Preserves leading/trailing spaces when `xml:space="preserve"` is set.
  - Fallback: ignores unknown XML elements (e.g. `<w:customXml>`, `<w:smartTag>`).
  - Rejects invalid / truncated buffers with clear error message.

### 3.2 `web_app/tests/unit/docx-export.test.ts`
Tests serializing Tiptap JSON AST into valid DOCX buffers:
- **Test Group 1: Buffer Generation & ZIP Packaging**:
  - Returns `Uint8Array` / `Buffer` with non-zero length.
  - Validates ZIP header signature (`0x50, 0x4B, 0x03, 0x04`).
  - Validates presence of `[Content_Types].xml`, `_rels/.rels`, `word/document.xml`, `word/styles.xml`.
- **Test Group 2: Page Setup & Margins**:
  - Serializes A4 dimensions: width 11906 dxa, height 16838 dxa.
  - Serializes page margins: Top 20mm -> 1134 dxa, Left 30mm -> 1701 dxa, Right 15mm -> 850 dxa, Bottom 20mm -> 1134 dxa.
- **Test Group 3: Paragraph & Run Formatting**:
  - Generates `<w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/>`.
  - Converts `fontSize: 13` to `<w:sz w:val="26"/>`.
  - Translates `textAlign: 'justify'` to `<w:jc w:val="both"/>`, `'center'` to `<w:jc w:val="center"/>`.
  - Translates `lineSpacing: 1.2` to `<w:line="288"/>`.
  - Translates `firstLineIndentMm: 10` to `<w:ind w:firstLine="567"/>`.
- **Test Group 4: Table Serialization**:
  - Exports 2-column header table with `borders: { top: { style: BorderStyle.NONE } ... }`.
  - Sets cell widths based on column ratios (`columnRatios: [0.45, 0.55]`).
  - Sets cell vertical alignment to `VerticalAlign.TOP` or `CENTER`.

### 3.3 `web_app/tests/unit/docx-roundtrip.test.ts`
Tests the complete cycle `DOCX -> Tiptap JSON -> DOCX`:
- **Test Group 1: End-to-End Cycle**:
  - Imports mock/real DOCX buffer -> produces Tiptap JSON AST -> exports to new DOCX buffer -> re-imports to second AST.
  - Asserts AST 1 deep-equals AST 2 within defined tolerances.
- **Test Group 2: Text Invariance**:
  - Asserts concatenated document text before and after roundtrip is 100% identical.
  - Asserts Vietnamese Unicode characters (`Độc lập - Tự do - Hạnh phúc`) are preserved identically.
- **Test Group 3: Attribute Retention**:
  - Asserts `fontSize`, `fontFamily`, `textAlign`, `lineSpacing`, `firstLineIndentMm` have zero drift across cycles.
  - Asserts table column counts, row counts, and cell texts are intact.
- **Test Group 4: Mutation Safety**:
  - Updates a body paragraph in Tiptap JSON (`firstLineIndentMm: 12.7`), exports, re-imports.
  - Asserts ONLY the updated property changed; all other document paragraphs and tables retain exact original values.

### 3.4 Verification Against E2E Test Runner
The E2E runner (`node web_app/e2e-tests/runner.js`) defines Tier 1 tests:
- `F05: High-Fidelity DOCX Import Engine` (OpenXML paragraph text, half-points parsing, dxa to mm margins, 2-column header/footer extraction, unknown tag fallback).
- `F06: High-Fidelity DOCX Export Engine` (mm to dxa page margins, Times New Roman declaration, paragraph spacing, borderless header table, ZIP structure).
- `F07: Roundtrip File Interop & Verification` (text integrity, table row/col counts, A4 margins, Vietnamese Unicode, valid zip header).
- `F08: Pure TypeScript Rule Engine Port` (Times New Roman rule, margin boundaries, national emblem 12-13pt, motto 13-14pt, body indent 10-12.7mm).

Execution command:
```bash
node web_app/e2e-tests/runner.js --filter="docx"
```
Or individually:
```bash
node web_app/e2e-tests/runner.js --filter="f05"
node web_app/e2e-tests/runner.js --filter="f06"
node web_app/e2e-tests/runner.js --filter="f07"
node web_app/e2e-tests/runner.js --filter="f08"
```
All assertions designed in unit test suites directly satisfy the validation rules verified by the E2E runner.
