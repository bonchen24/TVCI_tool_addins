# Task Dispatch: M5 Iteration 2 Explorer 3 (UI Workflows, Diff Integration & Modal a11y)

## Identity
- Role: Explorer
- Working directory: e:\CODING\TVCI_word_addins\.agents\teamwork\m5_it2_explorer_3\
- Report file: e:\CODING\TVCI_word_addins\.agents\teamwork\m5_it2_explorer_3\handoff.md

## Iteration 1 Failure Feedback
Reviewer 2 identified major UI/UX workflow and editor integration issues:
1. `AiWorkspacePanel.tsx`: In the Template Fill tab, extracted fields are displayed read-only with no button or action to apply or insert those fields into the document or form.
2. `diff.ts` + `AiWorkspacePanel.tsx`: Content duplication bug in Proofreading Apply. When the full document is checked or no explicit text range is selected in the editor, `applyAiDiffToSelection` calls `insertContent(acceptedText)` without replacing the existing text, duplicating the entire document.
3. `DiffPreviewModal.tsx`: Missing `Escape` key close handler (`keydown` listener) and missing `aria-labelledby` on the modal dialog.

## Output Requirements
Investigate and write `analysis.md` and `handoff.md` detailing the exact fixes for `AiWorkspacePanel.tsx`, `diff.ts`, and `DiffPreviewModal.tsx`:
- Add "Chèn vào văn bản" / "Áp dụng biểu mẫu" action button in Template Fill tab.
- Fix document duplication: replace whole document content or range properly when selection is empty.
- Add `Escape` key handler and `aria-labelledby` attribute for modal accessibility.
- Fix any unit test regressions in `ai-diff.test.ts` and `ai-template-fill.test.ts`.
