## 2026-09-29T04:54:51Z
You are M3 Explorer 2 for Milestone 3: `administrative-format-engine` of the TVCI Web Application project.
Your working directory is: e:\CODING\TVCI_word_addins\.agents\teamwork\m3_explorer_2\
Your parent conversation ID: c334c6db-8f15-4213-b7fc-7e7a2e6ba3a0

MANDATORY FIRST STEP:
Read the user's original request verbatim at:
e:\CODING\TVCI_word_addins\.agents\teamwork\ORIGINAL_REQUEST.md
Also read the master project architecture at:
e:\CODING\TVCI_word_addins\PROJECT.md
Inspect existing UI components in:
e:\CODING\TVCI_word_addins\web_app\src\components\layout\Sidebar.tsx
e:\CODING\TVCI_word_addins\web_app\src\components\layout\StatusBar.tsx
e:\CODING\TVCI_word_addins\web_app\app\page.tsx

OBJECTIVE:
Investigate and design the real-time Administrative Audit Panel UI and evaluation hook:
1. Real-time evaluation hook (`web_app/src/hooks/useDocumentAudit.ts`):
   - Listen to editor transactions/updates with debouncing (e.g. 150ms).
   - Convert editor doc to snapshots via `tiptapDocToSnapshots()`.
   - Run `evaluateDocumentRules(snapshots, activeProfile)`.
   - Return `{ healthScore, issueCount, issues, isAuditing, profile, setProfile }`.
2. Audit Panel UI in `Sidebar.tsx`:
   - Design issue card components showing severity badge (Critical: Rose, Major: Amber, Minor: Slate), element type tag (Quốc hiệu, Tiêu ngữ, Số ký hiệu, Thân bài, Nơi nhận, Người ký), rule explanation, and "Sửa mục này" individual fix button.
   - Filter/group issues by severity or component.
   - Empty state when health score is 100% (Green Shield, positive message).
3. Status Bar & Profile Selector:
   - Live health score badge in `StatusBar.tsx` (Emerald >= 90, Amber 70-89, Rose < 70).
   - Profile selector in Header or Status Bar ("NĐ 30/2020 TVCI", "Chuẩn nghiêm ngặt", "Nội bộ doanh nghiệp").

OUTPUT:
Write your full analysis to `e:\CODING\TVCI_word_addins\.agents\teamwork\m3_explorer_2\analysis.md`
Write a self-contained `handoff.md` in your working directory.
Update `progress.md` with timestamps. Send completion message back to parent.
