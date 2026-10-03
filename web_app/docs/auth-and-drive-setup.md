# TVCI accounts and Google Drive setup

This guide describes the current `web_app` behavior. The root [`design.md`](../../design.md) remains the privacy and architecture source of truth.

## Clean-clone and production deployment

From a clean clone, install the locked dependencies for local development and prepare a private environment file:

```sh
cd web_app
corepack pnpm install --frozen-lockfile
cp .env.example .env
```

Edit `.env` locally or populate it from your deployment secret store. The root `.gitignore` excludes `web_app/.env*` while retaining `.env.example`; do not remove that protection or commit the populated file. Replace the example superadmin username and set `SUPERADMIN_INITIAL_PASSWORD` at the same time. On its first login, the app creates that account with a password hash and requires a password change. After the account exists, unset or remove **both** `SUPERADMIN_USERNAME` and `SUPERADMIN_INITIAL_PASSWORD`; the app skips bootstrap when both are absent, and rejects a partial pair. The variables are optional at Compose startup so the bootstrap credentials can be removed afterward. Clear all four Drive placeholders if Drive is unused.

In production, Docker Compose builds the image from the checked-in lockfile and starts the service from `web_app/`:

```sh
docker compose build
docker compose up -d
```

Compose reads `web_app/.env` automatically and passes the superadmin, Google OAuth, and encryption variables into the app container. It uses `/app/data/tvci.db` in a persistent named volume; the app is available on host port `2350`. Keep `.env` access restricted and use a deployment secret store where available.

Google Drive is optional. If it is unused, leave `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI`, and `DRIVE_TOKEN_ENCRYPTION_KEY` unset or blank; Compose allows all four to be absent. To enable Drive, set all four: configure the OAuth client and production HTTPS callback URI, then set `DRIVE_TOKEN_ENCRYPTION_KEY` to a random 32-byte value encoded as base64 (or a 64-character hex value). Keep the key stable and backed up securely; losing it prevents decryption of stored Drive credentials. Drive credentials are stored encrypted with AES-256-GCM.

For local development, copy `.env.example` to `.env.local`, supply both superadmin bootstrap values together, clear the four Drive placeholders unless Drive is being tested, and run `corepack pnpm run dev` from `web_app/` (port 1350 by default).

The SQLite file defaults to `web_app/data/tvci.db` when started from this directory. `DATABASE_DIR` and `DATABASE_PATH` can override its location. If initialization finds the legacy document-content tables, the privacy migration drops those tables, vacuums the database, and truncates its WAL without making a content backup. See [`privacy-storage-migration.md`](privacy-storage-migration.md) before upgrading a database that still has legacy content.

## Accounts, consent, and recovery

- A TVCI account uses a username and password; Google is not a TVCI sign-in provider. Registration does not request name, email, phone number, address, or other personal identity fields. Usernames are 3–32 letters, numbers, underscores, or hyphens. Passwords must be 12–128 characters and are stored as scrypt hashes.
- Registration requires the user to check the current terms acceptance box. The current terms version in the app is `2026-10-02-v1`. If the version changes, the app requires the user to accept the current version before normal protected use. Superadmin can inspect each account's consent status, version, and acceptance time, but cannot accept terms for another user.
- A recovery code is generated at registration and shown once. Only its hash is stored. A signed-in user can issue a replacement code, and superadmin can issue one for another account; either action invalidates the previous code, and the new code is shown once. A recovery code can be used once to set a new password. The app claims the code, updates the password, and invalidates all existing sessions in one SQLite transaction, so a consumed code cannot be reused.
- A signed-in user can change their password at any time by confirming the current password. A successful change invalidates existing sessions and issues a fresh session to the current browser. The bootstrap superadmin still must change the initial password before continuing.
- A normal user can delete their own account after confirming the current password, checking the deletion confirmation, and re-entering the username. The superadmin self-delete request is blocked. Account deletion removes the local account and related security, consent, and per-user dictionary records. If Drive credentials are available, the app attempts to revoke them; a failed revoke does not prevent local deletion.

## Google Drive configuration and behavior

1. In Google Cloud, enable the Google Drive API and configure an OAuth web application client.
2. Add the exact `GOOGLE_REDIRECT_URI` value to its authorized redirect URIs. The local default is `http://localhost:1350/api/drive/callback`; production must use the deployed HTTPS origin.
3. Put the OAuth client ID and secret in `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`, and set the encryption key described above. All four Drive variables must be present to use Drive; they may all be omitted when Drive is unused.
4. Google Drive is optional and is connected only when the signed-in user chooses to connect it. The app requests only `https://www.googleapis.com/auth/drive.file` with offline access for refresh credentials. It does not use Google for TVCI sign-in or request email, profile, OpenID, full-Drive, or readonly scopes.

The app creates or uses its tagged `TVCI Document Platform/` root and the `Documents/`, `Templates/`, `Knowledge/`, `References/`, and `AppData/` folders. Drive operations are restricted to TVCI-managed files in the corresponding app folder; unrelated Drive files are not scanned. `AppData/manifest.json` contains file IDs, category, title, timestamps, schema version, and optional user tags, not file content. Google Picker and arbitrary existing-Drive-file imports are not implemented; references can be added from explicit local `.txt`, `.md`, or `.json` imports or entered by the user.

Drive access and storage are optional. Without a Drive connection, the editor remains usable and document content remains in browser memory until the user exports or downloads it. When the user chooses to save, Documents, personal templates, Knowledge, and References are stored in that user's Google Drive.

OAuth access and refresh credentials are encrypted in the TVCI database with AES-256-GCM using `DRIVE_TOKEN_ENCRYPTION_KEY`. Disconnecting Drive attempts to revoke the remote credentials and removes the local credential and folder metadata even if revocation fails. Account deletion also attempts revocation when possible. Neither action deletes, trashes, moves, renames, or changes permissions on any Drive file or folder; users manage those files in Google Drive.

Knowledge and Reference content is saved only after an explicit user action. It is not automatically learned from editor documents, prompts, or AI output. To use an item as AI context, the user checks it for the next AI request; queued items are visible and removable in the editor. Only checked Knowledge and Reference content is added as personal-resource context; the request also contains the prompt or text entered for that AI action. The queue is held in browser memory, remains visible and removable while the document is edited, clears after a successful AI request or a document reset/new document, and remains available if a request fails.

## Persistence and spell-check

The TVCI server database stores account and security metadata, terms acceptance history, minimal Drive folder state, encrypted Drive credentials, short-lived hashed OAuth state, and user-added spell-check terms. It does not persist editor document bodies, Knowledge, References, personal template content, prompts, or AI responses as TVCI server content. AI request payloads are processed to return the requested result, but the app does not save them as server-side document records. The user's Google Drive is the optional long-term store for content they explicitly save.

Vietnamese spell-check runs in the browser. A user may explicitly add an individual term to their account dictionary and can remove it later. The TVCI database stores only those opted-in terms for that account; it does not receive or store the document text for spell-check.

Live OAuth requires valid deployment credentials and Google consent configuration. Automated tests use deterministic mocked Google endpoints and do not need credentials.
