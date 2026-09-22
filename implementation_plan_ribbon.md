# Ribbon architecture and UX plan

## Scope

- Preserve the existing working tree and keep this change limited to Ribbon manifest resources, command wiring, dialog routing, labels/tooltips/icons, and focused tests.
- Keep the Ribbon as the only visible Word entry surface: no Ribbon `ShowTaskpane` actions.
- Retain the manifest `DefaultSettings` task-pane source only as TaskPaneApp compatibility required by Office; it is not exposed as a Ribbon action.

## Final Ribbon layout

The custom `TVCI` tab has four compact groups, in this order:

1. **AI trợ lý**
   - **Soạn thảo AI** → `openSmartDraftingDialog`
   - **Tạo kinh nghiệm** → `openLearnExperienceDialog`
   - **Kho tri thức** → `openKnowledgeDialog`
   - **Cài đặt AI** → `openSettingsDialog`
2. **Văn bản và biểu mẫu**
   - **Tạo văn bản** menu → the nine existing document skeleton commands
   - **Kho biểu mẫu** → `openTemplateLibraryDialog`
   - **Tạo biểu mẫu** → `openTemplateWizardDialog` → existing `builder` dialog route and Template Wizard flow
   - **Kiểm tra & cấu hình** menu:
     - **Kiểm tra văn bản** → `openInspectorDialog`
     - **Cấu hình văn bản** → `openDocumentSettingsDialog`
   - **Chuẩn hóa nhanh** → `run1ClickStandardize`
   - **Hoàn tác chuẩn hóa** → `runRollbackLastAction`
3. **Chèn nhanh**
   - Existing quick insert menu: Kính gửi, Căn cứ, Nơi nhận, Người ký, Phụ lục, Đề mục.
4. **Trang và công cụ**
   - Existing page/layout actions: Khổ lề A4, Hướng trang, Số trang, Co bảng vừa trang, Xóa trang trắng.
   - Existing tools added to the same compact menu: Chuyển Unicode and Dọn khoảng trắng.

## UX decisions

- Use short, action-oriented Vietnamese labels and tooltips; replace the stale visible/error wording `Nhận kinh nghiệm` with `Tạo kinh nghiệm` without changing stored data semantics.
- Keep Tạo biểu mẫu and Tạo kinh nghiệm as direct top-level `Button` controls rather than menu items.
- Expose Kho tri thức directly because its command and `knowledge` dialog route already exist and render the existing Knowledge modal.
- Reuse the current Ribbon icon family at 16/32/80px sizes; no new bitmap assets are required.
- Every visible `ExecuteFunction` is declared on `self`/`window`, included in `functionMap`, and associated through `Office.actions`.

## Test-first checklist

- [x] Updated focused manifest and command-mapping tests for direct creation/learning buttons, labels, groups, Knowledge, page tools, and no `ShowTaskpane` actions.
- [x] Confirmed the focused tests fail before the manifest/command changes (missing Knowledge, Unicode, and cleanup controls).
- [x] Implemented the Ribbon resources, controls, command mappings, and existing dialog routes.
- [x] Focused Jest and Ribbon Node QA pass.
- [x] Run typecheck, full Jest, full QA, production build, and manifest validation.

## Verification criteria

- Four groups are ordered AI trợ lý, Văn bản và biểu mẫu, Chèn nhanh, Trang và công cụ.
- Tạo biểu mẫu and Tạo kinh nghiệm are direct top-level buttons with exact visible labels.
- No Ribbon control uses `ShowTaskpane`; no dead or unregistered `ExecuteFunction` remains.
- Knowledge, builder, learning, settings, inspector, and template-library controls route to working Office dialogs.
- Unicode conversion and text cleanup are visible in Trang và công cụ and map to existing handlers.

## Visual and safety polish

- Fix the DeleteBlankPages Ribbon image URLs to use the existing singular `icon-delete-blank-page` assets.
- Reuse the existing semantic 16/32/80px icon families for Kho biểu mẫu, Tạo biểu mẫu, Kho tri thức, Chuyển Unicode, and Dọn khoảng trắng; keep only image resources referenced by visible Ribbon controls.
- Add the direct Hoàn tác chuẩn hóa button immediately after Chuẩn hóa nhanh, routed to the existing `runRollbackLastAction` handler with a tooltip scoped to the add-in standardization flow.
- Consolidate the lower-frequency document inspection and configuration actions into the compact **Kiểm tra & cấu hình** menu; keep that menu before the direct standardize/recovery pair so the normal workflow remains create → inspect → standardize → recover.
- Keep the four-group order and task-pane compatibility source unchanged, with no Ribbon `ShowTaskpane` action.
- Strengthen focused QA for direct control routing, semantic icon wiring, visible command registration, duplicate resource IDs, and local existence of every declared localhost Ribbon image.

## Manifest updater hardening decision

- `update-manifest.js` is not referenced by `package.json` scripts or installer flows; it remains a manually invoked maintenance utility only.
- The utility now validates the current four-group Ribbon and required direct/menu controls, then performs a guarded read-only no-op when the manifest is canonical. It never reconstructs Ribbon XML, appends resources, or writes the manifest.
- A noncanonical manifest is rejected with a clear error and is left untouched. This prevents retired groups, task-pane actions, stale labels, and duplicate resource IDs from being introduced by a manual run.
- Focused QA executes the exported updater operation against temporary fixtures, verifies byte-for-byte idempotence across repeated runs, and confirms the canonical controls/resources remain intact without mutating `manifest/manifest.xml`.

## Phase 2 density audit

- **AI trợ lý**: four direct buttons are acceptable; the labels are short enough and the direct actions are the primary AI entry points, including the required direct **Tạo kinh nghiệm** and **Kho tri thức** actions.
- **Văn bản và biểu mẫu**: the previous seven top-level controls were the only clear density problem. **Kiểm tra văn bản** and **Cấu hình văn bản** are lower-frequency actions, so they now share one menu. **Kho biểu mẫu**, **Tạo biểu mẫu**, **Chuẩn hóa nhanh**, and the clearly distinct **Hoàn tác chuẩn hóa** remain direct.
- **Chèn nhanh** and **Trang và công cụ**: their six- and seven-item menus are appropriate for infrequent, context-specific actions and avoid crowding the tab.
- Ordering now follows the normal document workflow left to right: create/find/build, inspect/configure, standardize, then recover. No destructive action was added; **Hoàn tác chuẩn hóa** remains visibly adjacent to but distinct from Word's general Undo.

## Package/install preservation hardening

- Add one read-only `scripts/ribbon-preservation.mjs` contract helper for canonical group/control identifiers, retired Ribbon markers, URL-independent Ribbon fingerprints, and manifest asset-path coverage.
- Verify production rendering changes only the supplied HTTPS base URL (with `AppDomain` reduced to its origin) while preserving the complete canonical `CustomTab` and `Resources` blocks.
- Generate a temporary local client package in QA and verify every manifest asset reference is present, including semantic library/builder/Unicode and singular delete-blank-page icons.
- Audit the installer pipeline contract (`assets` → webpack `dist` → installer staging `app` → recursive Inno copy) with the same asset coverage check without creating a release artifact.
- Make `installer/verify.ps1` inspect only the installed `manifest\manifest.xml`; report `FAIL Ribbon manifest` for stale legacy markers or missing canonical identifiers, including the four-group order. `-RibbonOnly` provides focused automated coverage of that installed-file check.
