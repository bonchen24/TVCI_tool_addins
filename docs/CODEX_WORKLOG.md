# Codex Worklog

## 2026-09-23

- Addressed seven user-reported document defects.
- Added fixed/workaround files: `form-content-control.service.fixed.ts`, `template-fill.fixed.ts`, `tvci-cong-van-template.fixed.docx`, `TemplateWizardModal.fixed.tsx`, `webpack.codex-fix.config.js`, `package-installer.fixed.mjs`, and the focused test file `tests/content-controls/form-generation-fixed.test.ts`.
- Focused regression tests: 6/6 passed. Production webpack build passed with performance warnings only. Manifest validation passed. Inno Setup packaging and `verify-installer` passed.
- Final release artifact: `TVCI-Word-Tools-Setup-0.1.11.exe` — 29,733,678 bytes; SHA256 `42e487ca5412bbea167eda6b1ce6bd17c8634af28fc26e3ea1eef4cbeed76dc6`.
- Remaining technical debt: reconcile or remove the old ACL-blocked source copies and fold fixed versions into canonical files when Windows sandbox permissions allow. This is not yet resolved.
