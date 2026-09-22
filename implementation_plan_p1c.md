# P1-C wiring fix plan

## Scope

- Preserve the current working tree and all existing installer/P0/P1-A/P1-B changes.
- Do not edit installer files, package installer output, or commit.
- Change only the AI clear bridge, document-settings default bridge, and Inspector footer wiring.

## Test-first checklist

- [x] Add focused regressions for AI clear persistence/event/state refresh.
- [x] Add focused regressions for `save_settings_default` persistence without Word application.
- [x] Add a source/UI regression for Inspector standardize/rollback prop destructuring and buttons.
- [x] Run focused tests and confirm RED.
- [x] Implement the smallest bridge and component changes.
- [x] Run focused tests, typecheck, and the requested full test command if time permits.

## Verification criteria

- AI clear sends `ai_settings_cleared`, clears parent storage, emits the existing AI update event, and refreshes to default settings with an empty API key without logging secrets.
- Save default sends `save_settings_default`; the parent persists and publishes document settings without calling `applySettingsToWord`.
- Save & Apply sends one applying message with persistence; Apply Only sends one applying message without persistence.
- Inspector exposes compact Standardize and Undo footer actions, both disabled while busy, while Re-scan and Fix all remain intact.
