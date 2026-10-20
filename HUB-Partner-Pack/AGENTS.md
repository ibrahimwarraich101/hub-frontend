# HUB shared context for Codex

Merge this guidance into the existing repository-root AGENTS.md. Preserve its
platform-specific rules. Paths below assume the pack's docs/ is at repository root;
if kept under information/, prefix those paths with information/.

Read docs/PARTNER_START_HERE.md, docs/DECISIONS.md, docs/REQUIREMENTS.md,
docs/ARCHITECTURE.md and the relevant module/integration documents before work.
HUB Drive is the first service module: read docs/HUB_DRIVE.md. Read the ERD
field dictionary and constraints before changing persistence or API behavior.
React website and React Native Android/iOS consume the same ASP.NET Core REST API.
Neither client accesses PostgreSQL directly. Preserve role and ownership checks.

Inspect actual source before claiming implementation. Proposed schema, historical
reports and diagram validation do not prove applied migrations or working features.
Agree shared API contracts; label mocks and unresolved decisions. Do not invent
fares, cancellation rules, provider fields or new scope. Update docs with actual
changes, checks and limitations after authorized work. Never include credentials.

This pack defines project context, not individual responsibilities. Shared master
reference: HUB-Documentation. Keep agreed updates synchronized across repositories.
Use the current repository's setup, navigation and validation commands; mobile
Expo rules do not define the separate React website's routing or build tooling.
