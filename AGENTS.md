# HUB repository instructions

## HUB project information

Shared project context is in `HUB-Partner-Pack/START_HERE.md` and
`HUB-Partner-Pack/docs/PARTNER_START_HERE.md`. Read those, then the included
DECISIONS.md, REQUIREMENTS.md, ARCHITECTURE.md and HUB_DRIVE.md before feature work.
All paths inside the pack are relative to that pack; keep it in this folder.
HUB Drive is the first service module. React website and React Native Android/iOS
clients use the same ASP.NET Core REST backend; neither accesses PostgreSQL directly.
Read the included database dictionary and constraints before persistence changes.
Inspect actual code and distinguish proposed design from implemented behavior.
Preserve this repository's platform-specific instructions. Do not infer individual
responsibilities or unresolved API/business decisions from the documentation.

## Team workflow rules (all HUB repos)

Full human-readable guide: `TEAM_GIT_WORKFLOW.md` in the repository root. Follow it. Key rules:

- Owners: Muhammad Hassaan = HUB Drive, Muhammad Siddique = HUB Food, Muhammad Ibrahim =
  E-Commerce store (code name `Marketplace`). Each owner builds their module's backend,
  website and mobile app. Do not change another owner's module code unless the user asks.
- All three people work in the same three GitHub repos (hub-backend, hub-frontend, hub-app).
- Branch names: `dev.<name>/<Module>_<Feature-Name>`, e.g. `dev.ibrahim/E-Commerce_Cart-Total`,
  `dev.hassaan/Drive_Ride-Acceptance`, `dev.siddique/Food_Menu-Items`. Never use `feature/` style names.
- Flow: feature branch -> `dev.<name>/<Module>_Merge` -> `development` -> `main`.
  Feature-branch pull requests target the owner's `_Merge` branch. `_Merge` branch pull requests
  target `development`. Never target or push to `main`. Never push directly to `development`.
- Shared work (shared tables, shared screens, team rules) uses a `dev.<name>/Shared_<Feature-Name>`
  branch that merges into `development` after the team agrees.
- Before starting work, and whenever `development` changes: merge `origin/development` into the
  owner's `_Merge` branch, then branch from it.
- Put module code in module folders (backend `Models|Contracts|Services|Controllers|Data/Configurations/<Module>/`;
  web `src/features/<module>/`; app screens `src/app/(<module>)/`, other app code `src/features/<module>/`).
  In shared files (`Program.cs`, `HubDbContext.cs`, app/web root layout and router) add only the
  minimum lines needed and never rewrite other modules' lines.
- Database: shared tables (users, roles, user_roles, sessions, user_addresses, service_engagements,
  engagement_status_history, transactions, payments, payment_events, payment_status_history,
  reviews, notifications, device_tokens, audit_entries, recommendation tables) change only on a
  `Shared_` branch. Role IDs: Customer=1, Driver=2, Administrator=3; new IDs only via `Shared_` branches.
  Pull `development` before creating a migration; name migrations `<Module>_<What>`; never hand-edit
  `HubDbContextModelSnapshot.cs` - recreate the migration instead.
- Never commit secrets, `bin/`, `obj/`, `node_modules/` or `dist/`. Never force-push shared branches.
- Commit messages: short plain English. Do not add `Co-Authored-By` AI trailers or "Generated with" lines
  to commits or pull requests.
