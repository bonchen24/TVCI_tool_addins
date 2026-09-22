# P1-A Cleanup Plan

## Scope

- Preserve existing AI, search, and installer changes.
- Remove department from the user-facing template workflows while retaining legacy record compatibility.
- Replace text-entry browser prompts with in-app editors.
- Add focused regression coverage and verify without packaging the installer.

## Checklist

- [x] Add focused failing tests for department-free workflows and prompt removal.
- [x] Make department optional for new/update inputs and preserve legacy values.
- [x] Remove department controls and labels from template library and wizard.
- [x] Add in-app template metadata editing and inline chat rename.
- [x] Keep custom AI model entry in the existing settings UI.
- [x] Run focused tests, typecheck, full Jest, build, and manifest validation.
