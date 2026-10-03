# Codex Memory

## 2026-09-23 — Word form generation

- Treat the template as the source of truth for fixed layout, headers, signatures, and labels. AI fills dynamic values and business body content only.
- Preserve formatting in existing template content controls. Do not globally force font or size on fixed text.
- Công văn geometry: A4 portrait; top and bottom margins 20 mm, left 30 mm, right 20 mm.
- Preserve the locality prefix in the administrative date; never replace the entire date paragraph in a way that drops the locality.
- For `NOI_DUNG` / `NOI_DUNG_CHUNG`, remove structural blocks (quốc hiệu, tiêu ngữ, Kính gửi, Nơi nhận, signer titles, and signature placeholders) by line or block rules, not blind substring deletion.
- The Kính gửi field contains recipients only, never the label; normalize duplicate bullets.
- AI prompts must preserve all meaningful source facts, avoid fabrication and duplicated structure, and preserve paragraph separation.
- Before packaging, all six focused regressions in `tests/content-controls/form-generation-fixed.test.ts` must pass.
- The production build uses `webpack.config.js` and canonical source paths. Do not add aliases to `.fixed.*` copies.
- Keep Codex tasks small. If a task shows no write or progress for about 60 seconds, terminate it and reduce scope. Avoid running full typecheck/build in every iteration.
