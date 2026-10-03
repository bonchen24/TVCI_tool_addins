# Project Memory

No Obsidian MCP is exposed in this Codex runtime. This repository file is the project memory fallback.

## Current web app architecture and invariants

- `design.md` is the source of truth. TVCI accounts use only usernames and passwords; auth stores password, session, and recovery hashes, role/status, and terms acceptance metadata. Normal protected app access requires current terms acceptance. Users can change passwords after confirming the current password. Admin views consent metadata but cannot accept terms for users.
- The TVCI database does not persist document bodies, personal templates, Knowledge, References, prompts, or AI responses. It stores account/security data, consent history, minimal Drive metadata, encrypted Drive credentials, short-lived hashed OAuth state, and only spell-check terms that users explicitly add to their account dictionary. Document text is spell-checked locally in the browser.
- Google Drive is optional, uses only the `drive.file` OAuth scope, and stores content only after the user requests a save. The app manages tagged files under its own `TVCI Document Platform` folders; `AppData/manifest.json` stores metadata. Disconnect and account deletion remove local credentials and attempt remote revocation but never delete or alter Drive files. Normal users can self-delete after confirmation; superadmin self-deletion is blocked.
- Knowledge and Reference items are not automatically learned or added to requests. The user explicitly selects items for the next AI request; only checked items are added as resource context alongside the user's prompt/text. The selection and loaded content stay in workspace memory, appear in a removable queue, and clear after success, document edits, or reset.

## Resolved recovery and context issues

- Recovery is one-use under concurrency: after password hashing, SQLite claims the matching unconsumed credential conditionally inside `BEGIN IMMEDIATE`; password replacement and deletion of all sessions commit in the same transaction. Concurrent attempts cannot both consume the same credential.
- AI context state belongs to the editor workspace, not the conditionally mounted Personal/AI panels. Selection toggles and panel switches therefore cannot leave an unselected payload queued. Only checked resource content is added as context; success clears the queue, a failed request leaves it available for retry, and document edits or creating a new document clear it.
