## 2026-09-29T04:29:33Z
Formulate exact remediation code and test specifications for Tab characters and Indentation in web_app/src/docx/importer.ts:
1. Root cause:
   - In parseRun (lines 166-185), <w:tab/> elements are skipped, losing tab stops and column separations in text runs.
   - In parseParagraph (lines 267-276), w:hanging is not inspected, and body paragraphs without explicit <w:ind> receive an unrequested 10mm indent even when they should be flush left.
2. Design fix:
   - In parseRun, handle child.localName === 'tab' by appending { type: 'text', text: '\t' } (or appropriate space run).
   - In parseParagraph, read getAttribute(ind, 'hanging') and calculate hanging offset or negative first line indent.
   - Ensure paragraphs inside table cells or headings never default to 10mm indent.
3. Specify unit test additions in web_app/tests/unit/docx-import.test.ts verifying tab preservation and hanging indent handling.
