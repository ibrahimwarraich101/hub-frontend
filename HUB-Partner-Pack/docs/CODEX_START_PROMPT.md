# Starting prompt for Codex

Use this after the pack's docs are placed at the repository root. If they live under information/, adjust the paths accordingly. This prompt requests understanding first; it does not authorize application changes.

```text
This is HUB, our integrated multi-service FYP. Read the root AGENTS.md,
docs/PARTNER_START_HERE.md, docs/DECISIONS.md, docs/PROJECT_CONTEXT.md,
docs/REQUIREMENTS.md, docs/ARCHITECTURE.md, docs/USER_ROLES.md and docs/SERVICES.md.
Read docs/DATABASE.md and the included ER Diagrams dictionary and constraints.
Read docs/PAYMENT_WORKFLOW.md, docs/EXTERNAL_APIS.md and
docs/RECOMMENDATION_SYSTEM.md for relevant integrations/shared features.
Our first service module is HUB Drive; read docs/HUB_DRIVE.md.
Check docs/REVIEW_REPORT.md for the limits of the information review.

Inspect the current repository source and tooling. Explain what HUB does,
how website/mobile/backend/database work together, the HUB Drive flow,
what is implemented versus documented, and unresolved contract/business rules.
Flag conflicts instead of silently inventing decisions or replacing source.
Do not change application code yet. Recommend one small milestone and its
acceptance checks, then wait for my implementation instruction.
```
