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
