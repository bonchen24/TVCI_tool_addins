# Phụ lục và bảng đánh số Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Thêm các thao tác Ribbon và task pane để chèn phụ lục ở cuối tài liệu, tạo bảng phụ lục có cột STT và đánh lại STT cho bảng đang chọn.

**Architecture:** Giữ logic Word trong `drafting.service.ts`, giữ dữ liệu/preset thuần trong `drafting/presets.ts`, và để `App.tsx` chỉ điều phối state, route và thông báo. Manifest chỉ mở đúng khu vực task pane; không chạy thao tác Word âm thầm từ Ribbon.

**Tech Stack:** React 18, TypeScript, Office.js Word API 1.3+, Office Add-in XML manifest, Node test runner, Jest, webpack.

**Spec:** `docs/superpowers/specs/2026-09-15-appendix-table-ribbon-design.md`

## Global Constraints

- Phụ lục mặc định chèn ở cuối tài liệu.
- Bảng phụ lục giới hạn 1–50 hàng và 1–20 cột.
- Đánh số chỉ cập nhật cột đầu của bảng đang chứa con trỏ; không đánh số mọi bảng trong tài liệu.
- Giữ vùng bấm task pane compact và không thêm dependency mới.
- Không thay đổi nội dung tài liệu nếu Word API báo lỗi hoặc vùng chọn không phải bảng.

---

### Task 1: Preset và dữ liệu bảng phụ lục

**Files:**
- Modify: `src/drafting/presets.ts`
- Test: `qa/drafting-tools.node.test.ts`

**Interfaces:**
- Produce `AppendixPreset` và `getAppendixPreset(profileId)`.
- Produce `buildAppendixTableValues(rows, columns, headerRow): string[][]` để service và test dùng chung.

- [ ] **Step 1: Write the failing test**

Thêm test kiểm tra tiêu đề phụ lục theo profile và giá trị bảng có `STT`, số thứ tự bắt đầu từ 1, ô nội dung còn lại để trống:

```ts
test('appendix preset and table values follow the selected profile', () => {
  const preset = getAppendixPreset('IEMM');
  assert.equal(preset.title, 'PHỤ LỤC');
  assert.equal(preset.fontName, 'Times New Roman');
  assert.equal(preset.fontSize, 14);
  assert.deepEqual(buildAppendixTableValues(3, 2, true), [
    ['STT', 'Tiêu đề 2'],
    ['1', ''],
    ['2', ''],
  ]);
  assert.deepEqual(buildAppendixTableValues(2, 2, false), [['1', ''], ['2', '']]);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --experimental-strip-types --test qa/drafting-tools.node.test.ts`

Expected: FAIL because `getAppendixPreset` and `buildAppendixTableValues` do not exist.

- [ ] **Step 3: Write minimal implementation**

Thêm type/preset dùng cỡ chữ profile hiện tại và helper giới hạn dữ liệu:

```ts
export interface AppendixPreset {
  title: string;
  fontName: string;
  fontSize: number;
  bold: boolean;
}

export function getAppendixPreset(profileId: RuleProfileId): AppendixPreset {
  return { title: 'PHỤ LỤC', fontName: 'Times New Roman', fontSize: genericSize(profileId), bold: true };
}

export function buildAppendixTableValues(rows: number, columns: number, headerRow: boolean): string[][] {
  const safeRows = Math.max(1, Math.min(50, Math.floor(rows)));
  const safeColumns = Math.max(1, Math.min(20, Math.floor(columns)));
  return Array.from({ length: safeRows }, (_, row) => Array.from({ length: safeColumns }, (_, column) => {
    if (headerRow && row === 0) return column === 0 ? 'STT' : `Tiêu đề ${column + 1}`;
    return column === 0 ? String(headerRow ? row : row + 1) : '';
  }));
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --experimental-strip-types --test qa/drafting-tools.node.test.ts`

Expected: PASS for the new test and all existing drafting tests.

---

### Task 2: Word service cho phụ lục, bảng và STT

**Files:**
- Modify: `src/word/drafting.service.ts`
- Test: `qa/drafting-tools.node.test.ts`

**Interfaces:**
- Produce `insertAppendix(profileId: RuleProfileId, title: string): Promise<void>`.
- Produce `insertAppendixTable(profileId: RuleProfileId, rows: number, columns: number, headerRow: boolean): Promise<void>`.
- Produce `numberSelectedTable(): Promise<void>`.

- [ ] **Step 1: Write the failing test**

Thêm test source contract để khóa các guard và thao tác Word cần thiết:

```ts
test('Word drafting exposes safe appendix and selected-table numbering operations', () => {
  const source = fs.readFileSync('src/word/drafting.service.ts', 'utf8');
  assert.match(source, /export async function insertAppendix\(/);
  assert.match(source, /TVCI_APPENDIX/);
  assert.match(source, /insertBreak\(Word\.BreakType\.page/);
  assert.match(source, /export async function insertAppendixTable\(/);
  assert.match(source, /buildAppendixTableValues/);
  assert.match(source, /export async function numberSelectedTable\(/);
  assert.match(source, /parentTable/);
  assert.match(source, /headerRowCount/);
  assert.match(source, /Hãy đặt con trỏ trong bảng cần đánh số/);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --experimental-strip-types --test qa/drafting-tools.node.test.ts`

Expected: FAIL because the three service functions do not exist.

- [ ] **Step 3: Write minimal implementation**

Implement `insertAppendix` with `document.body.insertBreak(Page, End)`, append a formatted paragraph, wrap it with a rich-text content control tagged `TVCI_APPENDIX`, and use the trimmed title or preset title.

Implement `insertAppendixTable` with `document.body.insertTable(..., buildAppendixTableValues(...))`, `headerRowCount`, `styleBuiltIn = 'TableGrid'`, Times New Roman body font, and center alignment for the first column.

Implement `numberSelectedTable` by reading `context.document.getSelection().parentTableOrNullObject`, loading `isNullObject`, `rowCount`, `headerRowCount`, and `rows/items/cells/items`, then setting only `cells.items[0].value` for data rows. Throw exactly `Hãy đặt con trỏ trong bảng cần đánh số.` if the selection is not in a table.

- [ ] **Step 4: Run test to verify it passes**

Run: `node --experimental-strip-types --test qa/drafting-tools.node.test.ts`

Expected: PASS for service contracts and existing drafting tests.

---

### Task 3: Task pane controls and Ribbon route

**Files:**
- Modify: `src/taskpane/App.tsx`
- Test: `qa/drafting-tools.node.test.ts`, `qa/template-ui.node.test.ts`

**Interfaces:**
- Route `?view=appendix` opens `#appendix-tools`.
- UI handlers call the three service functions through the existing `run` wrapper.

- [ ] **Step 1: Write the failing test**

Thêm assertions cho route, state và labels:

```ts
test('task pane exposes appendix and selected-table controls', () => {
  const source = fs.readFileSync('src/taskpane/App.tsx', 'utf8');
  for (const label of ['Phụ lục & bảng', 'Thêm phụ lục', 'Tạo bảng phụ lục', 'Đánh số bảng']) {
    assert.match(source, new RegExp(label));
  }
  assert.match(source, /appendix-tools/);
  assert.match(source, /insertAppendix\(ruleProfileId/);
  assert.match(source, /insertAppendixTable\(ruleProfileId/);
  assert.match(source, /numberSelectedTable\(\)/);
  assert.match(source, /appendix:\s*['"]appendix-tools['"]/);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --experimental-strip-types --test qa/drafting-tools.node.test.ts qa/template-ui.node.test.ts`

Expected: FAIL because the state, handlers, route and controls are absent.

- [ ] **Step 3: Write minimal implementation**

Import the service functions, add `appendixTitle` state defaulting to `PHỤ LỤC`, add the three `run` handlers with Vietnamese status messages, map `appendix` in the URL route effect, and add a compact `draftGroup` with title, row/column controls, header checkbox, and the three buttons under `id="appendix-tools"`.

- [ ] **Step 4: Run test to verify it passes**

Run: `node --experimental-strip-types --test qa/drafting-tools.node.test.ts qa/template-ui.node.test.ts`

Expected: PASS for the new task pane tests and existing UI tests.

---

### Task 4: Ribbon controls and manifest resources

**Files:**
- Modify: `manifest/manifest.xml`
- Test: `qa/ribbon-manifest.node.test.ts`

**Interfaces:**
- `AppendixButton`, `AppendixTableButton`, and `NumberTableButton` open `Taskpane.Appendix.Url`.
- Ribbon group label is `Phụ lục & bảng` and each button has an explanatory tooltip.

- [ ] **Step 1: Write the failing test**

Thêm the new labels and IDs to the existing Ribbon tests, including route assertions:

```ts
for (const label of ['Phụ lục & bảng', 'Thêm phụ lục', 'Tạo bảng phụ lục', 'Đánh số bảng']) {
  assert.match(manifest, new RegExp(label));
}
for (const id of ['AppendixButton', 'AppendixTableButton', 'NumberTableButton']) {
  assert.match(manifest, new RegExp(`id="${id}"[\\s\\S]*?<Action xsi:type="ShowTaskpane">`));
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --experimental-strip-types --test qa/ribbon-manifest.node.test.ts`

Expected: FAIL because the manifest has no appendix group/resources.

- [ ] **Step 3: Write minimal implementation**

Add one compact `GroupAppendix` after the drafting group, add the three button controls using the TVCI icon resources and `Taskpane.Appendix.Url`, add the URL resource `https://localhost:38473/taskpane.html?view=appendix`, and add matching short/long strings.

- [ ] **Step 4: Run test to verify it passes**

Run: `node --experimental-strip-types --test qa/ribbon-manifest.node.test.ts`

Expected: PASS with the existing 12 controls plus the three appendix controls.

---

### Task 5: Full verification and local package refresh

**Files:**
- Modify: `release/tvci-word-tools-local-1.0.0.2/src/...` through the package refresh command.

- [ ] **Step 1: Run focused tests**

Run: `node --experimental-strip-types --test qa/drafting-tools.node.test.ts qa/template-ui.node.test.ts qa/ribbon-manifest.node.test.ts`

- [ ] **Step 2: Run full checks**

Run in parallel: `npm run test:qa`, `npm test -- --runInBand`, `npm run typecheck`, `npm run build`.

- [ ] **Step 3: Refresh the client package**

Run the existing `scripts/package-local-client.mjs` into a temporary output, copy it over `release/tvci-word-tools-local-1.0.0.2`, and remove only that temporary directory.

- [ ] **Step 4: Verify the package and live task pane**

Confirm the package contains the updated manifest, App, service and presets; open `https://localhost:38473/taskpane.html?view=appendix` and verify the `Phụ lục & bảng` section is visible and compact.

The project has no Git metadata in the workspace, so use the test/build/package outputs as checkpoints instead of creating a commit.
