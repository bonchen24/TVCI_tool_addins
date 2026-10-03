# Privacy storage migration

At first database initialization after this change, the app checks for the legacy
`documents`, `document_versions`, `user_templates`, and `audit_logs` tables. If
any are present, it drops them in foreign-key-safe order, enables SQLite secure
deletion, vacuums the database, and truncates the WAL before creating the
account/security/Drive tables. Legacy editor content is intentionally not copied
or backed up to another TVCI location. Users should export any legacy documents
they still need before the updated server initializes its database.

The active schema retains only usernames, password hashes, roles/status,
sessions/recovery hashes, accepted terms versions/timestamps, encrypted Drive
credentials and minimal Drive folder state, plus short-lived hashed OAuth state.
Document bodies, personal templates, Knowledge, References, AI prompts/results,
and editor audit history are not stored in the TVCI SQLite database.
