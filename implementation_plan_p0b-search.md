# P0-B Search Normalization Plan

## Scope

- Preserve existing P0-A AI and installer work.
- Reuse `normalizeVietnamese` and `searchTemplates` in both template modals.
- Cover accent-insensitive Vietnamese matching, punctuation/whitespace normalization, fields, filters, and ordering with focused tests.

## Checklist

- [x] Add focused library and modal regression tests and confirm they fail before implementation.
- [x] Replace modal-local raw text matching with `searchTemplates`.
- [x] Normalize punctuation consistently while preserving fuzzy matching and sorting.
- [x] Run focused tests and `npm run typecheck`.
