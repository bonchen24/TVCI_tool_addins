# P1-B normal Task Pane chat surface

## Scope

- Keep the existing App command handlers, Word services, modal/dialog components, history persistence, attachments, and contextual AI callbacks.
- Make `AiTaskpaneView` render only a compact AI header/context, chat transcript, contextual assistant actions, and composer.
- Keep conversation history in a compact drawer/menu and remove only duplicate normal-pane controls.

## Verification

- Focused `tests/taskpane/p1b-chat-surface.test.ts` passes.
- `npm run typecheck` passes.
- `npm test -- --runInBand` passes when runner time permits.
