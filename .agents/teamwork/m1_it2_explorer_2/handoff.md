# Handoff Report — Milestone 1 Iteration 2: CSS & Layout Remediation

**Agent**: M1 Iteration 2 Explorer 2  
**Role**: Explorer (Read-only investigation & layout specification)  
**Parent Conversation ID**: `c334c6db-8f15-4213-b7fc-7e7a2e6ba3a0`  
**Working Directory**: `e:\CODING\TVCI_word_addins\.agents\teamwork\m1_it2_explorer_2\`  
**Target Files**:
- `e:\CODING\TVCI_word_addins\web_app\src\styles\a4-canvas.css`
- `e:\CODING\TVCI_word_addins\web_app\src\components\editor\A4Canvas.tsx`

---

## 1. Observation

1. **Table Cell Text Overflow in `a4-canvas.css:19-33`**:
   Verbatim lines 24–33:
   ```css
     table-layout: fixed;
     border: none !important;
   }

   .tiptap-table.borderless-table td {
     padding: 2px 4px;
     vertical-align: top;
     box-sizing: border-box;
     border: 1px dashed rgba(203, 213, 225, 0.7);
     transition: border-color 0.15s ease;
   }
   ```
   No `overflow-wrap`, `word-break`, or `overflow` property is defined on `.tiptap-table.borderless-table td` or its descendants. Grep search across `web_app/` for `overflow-wrap` and `break-word` returned 0 matches.

2. **Inline Style Specificity Collision in `a4-canvas.css:45-61` vs `extensions.ts:338-344`**:
   In `web_app/src/editor/extensions.ts:342`:
   ```ts
   renderHTML: (attributes) => {
     if (!attributes.colwidth) return {};
     return {
       'data-colwidth': attributes.colwidth.join(','),
       style: `width: ${attributes.colwidth[0]}px`,
     };
   },
   ```
   In `web_app/src/styles/a4-canvas.css:46-61`:
   ```css
   /* Header Table Ratio (40% - 60%) */
   .tiptap-table.admin-header-table td:first-child {
     width: 40%;
   }

   .tiptap-table.admin-header-table td:last-child {
     width: 60%;
   }

   /* Footer Table Ratio (50% - 50%) */
   .tiptap-table.admin-footer-table td:first-child {
     width: 50%;
   }

   .tiptap-table.admin-footer-table td:last-child {
     width: 50%;
   }
   ```
   In `schema.ts:22, 115, 303, 406`, cells possess `colwidth: [250]`, `colwidth: [374]`, and `colwidth: [312]`. Tiptap renders `<td style="width: 250px">`.

3. **Horizontal Viewport Clipping in `A4Canvas.tsx:26-29` and `page.tsx:102`**:
   In `web_app/src/components/editor/A4Canvas.tsx:26-29`:
   ```tsx
   <div
     className={`a4-canvas-scroll-container bg-slate-200/70 overflow-y-auto py-8 px-4 flex justify-center min-h-full ${className}`}
     data-testid="a4-canvas-container"
   >
     <div className="relative">
       {/* A4 Paper Sheet */}
       <div
         data-testid="a4-sheet"
         style={{
           width: '210mm',
           minHeight: '297mm',
           ...
         }}
   ```
   In `web_app/app/page.tsx:102`:
   ```tsx
   <main className="flex-1 flex flex-col overflow-hidden bg-slate-100">
   ```
   A4 paper width = `210mm` (~794px at 96 DPI) + 32px padding = `826px`.
   Sidebar width = `384px` (`w-96`).
   At screen width 1024px or 1200px with sidebar open:
   Available canvas width is `1024 - 384 = 640px` or `1200 - 384 = 816px`, both < 826px.
   Because `overflow-y-auto` only scrolls the Y axis and the parent `<main>` sets `overflow-hidden`, the right ~186px of the canvas is clipped with no scrollbar.

---

## 2. Logic Chain

1. **Table Cell Text Overflow (Observation 1 -> Fix 1)**:
   - Fixed table layout (`table-layout: fixed`) fixes column widths.
   - Long administrative symbols (e.g. `125/VCNM-TTTN/2026/TB-TKV-KĐAT`) have no whitespace break points.
   - Without `overflow-wrap: break-word` and `word-break: break-word`, the browser renders the string continuously outside the cell width (~66mm / 250px).
   - Without `overflow: hidden`, overflowing characters bleed into the adjacent column, obscuring the National Motto.
   - Adding `overflow-wrap: break-word; word-break: break-word; overflow: hidden;` to `.tiptap-table.borderless-table td` forces text wrapping at arbitrary grapheme clusters when needed and enforces a hard cell bounding box.

2. **Column Ratio Collision (Observation 2 -> Fix 2)**:
   - Standard CSS specificity: inline `style="width: 250px"` has weight `(1, 0, 0, 0)`.
   - External stylesheet selector `.tiptap-table.admin-header-table td:first-child` has weight `(0, 0, 2, 1)`.
   - Because `(1, 0, 0, 0) > (0, 0, 2, 1)`, the inline pixel width overrides the CSS rule.
   - Fixed pixel widths do not adjust when page margins change (e.g. left margin 30mm -> 35mm) or under print layout.
   - Author stylesheet rules with `!important` take precedence over inline styles lacking `!important`.
   - Adding `!important` to `.tiptap-table.admin-header-table td:first-child { width: 40% !important; }`, `.tiptap-table.admin-header-table td:last-child { width: 60% !important; }`, and both `.admin-footer-table` cells (`50% !important;`) guarantees strict NĐ 30/2020 ratio adherence.
   - Regular content tables (`tableType === 'content'`) do not receive administrative classes and retain custom user pixel widths without interference.

3. **Horizontal Viewport Clipping (Observation 3 -> Fix 3)**:
   - On viewports < 1200px with the 384px sidebar open, available canvas width is < 826px.
   - `overflow-y-auto` only enables vertical scroll. Parent `<main>` clips horizontal overflow.
   - Replacing `overflow-y-auto` with `overflow-auto` enables bidirectional scrolling on the canvas container whenever width is constrained.
   - `web_app/app/globals.css:20-33` already defines `::-webkit-scrollbar { height: 6px; }`, ensuring a sleek horizontal scrollbar.
   - Furthermore, adding `m-auto` to the child `<div className="relative m-auto">` ensures safe flex centering: when width > 826px, margins absorb free space to center the sheet; when width < 826px, auto margins collapse to 0, preventing negative coordinate cutoff so the user can scroll from the 0 coordinate without clipping the left margin.

---

## 3. Caveats

1. **Read-Only Scope**: This report provides exact remediation code and diffs. Source code modification is reserved for the implementation worker.
2. **Browser Scroll Origin in Flexbox**: Standard CSS flex `justify-center` with `overflow-auto` causes content to overflow into negative coordinates unless safe centering (`justify-content: safe center` or child `m-auto`) is used. Adding `m-auto` to `<div className="relative m-auto">` completely resolves this.
3. **Print Mode**: `web_app/src/styles/a4-canvas.css:94-99` defines `.a4-canvas-scroll-container { overflow: visible !important; }`, ensuring print previews and physical printing are unaffected by screen scroll rules.

---

## 4. Conclusion

The 3 reported defects have exact, self-contained CSS and JSX remediations requiring minimal diffs across only two files:

### Target 1: `web_app/src/styles/a4-canvas.css`
1. Add wrapping rules to lines 27–33:
   ```css
   .tiptap-table.borderless-table td {
     padding: 2px 4px;
     vertical-align: top;
     box-sizing: border-box;
     border: 1px dashed rgba(203, 213, 225, 0.7);
     transition: border-color 0.15s ease;
     overflow-wrap: break-word;
     word-break: break-word;
     overflow: hidden;
   }
   ```
2. Add `!important` to lines 46–61:
   ```css
   /* Header Table Ratio (40% - 60%) */
   .tiptap-table.admin-header-table td:first-child {
     width: 40% !important;
   }

   .tiptap-table.admin-header-table td:last-child {
     width: 60% !important;
   }

   /* Footer Table Ratio (50% - 50%) */
   .tiptap-table.admin-footer-table td:first-child {
     width: 50% !important;
   }

   .tiptap-table.admin-footer-table td:last-child {
     width: 50% !important;
   }
   ```

### Target 2: `web_app/src/components/editor/A4Canvas.tsx`
Update lines 26–30:
```tsx
  return (
    <div
      className={`a4-canvas-scroll-container bg-slate-200/70 overflow-auto py-8 px-4 flex justify-center min-h-full ${className}`}
      data-testid="a4-canvas-container"
    >
      <div className="relative m-auto">
```

---

## 5. Verification Method

1. **Verify CSS Specificity & Wrapping**:
   - Inspect `web_app/src/styles/a4-canvas.css`.
   - Confirm `.tiptap-table.borderless-table td` contains `overflow-wrap: break-word; word-break: break-word; overflow: hidden;`.
   - Confirm `.tiptap-table.admin-header-table td:first-child` has `width: 40% !important;`, `last-child` has `width: 60% !important;`.
   - Confirm `.tiptap-table.admin-footer-table td:first-child` has `width: 50% !important;`, `last-child` has `width: 50% !important;`.
2. **Verify Component Classes**:
   - Inspect `web_app/src/components/editor/A4Canvas.tsx:27`.
   - Confirm `overflow-auto` replaces `overflow-y-auto`.
   - Confirm `<div className="relative m-auto">` prevents negative scroll clipping.
3. **Automated Unit Test**:
   - Run Vitest suite in `web_app`:
     ```bash
     npm test
     ```
   - In `web_app/tests/unit/components.test.tsx`, add an assertion confirming `a4-canvas-container` contains class `overflow-auto`.
4. **Invalidation Condition**:
   - If an administrative table with symbol `125/VCNM-TTTN/2026/TB-TKV-KĐAT` bleeds into the motto cell.
   - If a cell with inline `style="width: 250px"` fails to render at 40% width in an admin header table.
   - If reducing the viewport below 1200px with sidebar open clips the canvas without displaying a horizontal scrollbar.
