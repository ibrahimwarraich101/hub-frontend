# HUB team workflow

This file is the same in all three repos: `hub-backend`, `hub-frontend` and `hub-app`.
Read it once. Your AI assistant (Claude Code or Codex) also reads these rules automatically.

## 1. Who builds what

Each person builds their **whole module**: backend API, website pages and mobile app screens.

| Person | Module | Branch name part | Code folder name |
|---|---|---|---|
| Muhammad Hassaan | HUB Drive (rides) | `Drive` | `Drive` / `drive` |
| Muhammad Siddique | HUB Food | `Food` | `Food` / `food` |
| Muhammad Ibrahim | E-Commerce store (like Daraz) | `E-Commerce` | `Marketplace` / `marketplace` |

The store uses `Marketplace` in code because C# names cannot contain `-`, and the database
design already calls these tables `marketplace_*`.

Not assigned yet: Fitness, Bills/Education payments, Expenses, Recommendations, Admin panel,
and the shared login/register screens. Agree an owner before anyone starts them.

## 2. All three of us work in the same repos

There is one `hub-backend`, one `hub-frontend` and one `hub-app` on GitHub. Everyone's code
ends up in the same project. Most files belong to one module, so they never clash.

A few files are **shared** and are edited by everyone. Conflicts only happen in these:

| Repo | Shared files |
|---|---|
| hub-backend | `Program.cs`, `Data/HubDbContext.cs`, `Data/Migrations/HubDbContextModelSnapshot.cs` |
| hub-frontend | `src/main.tsx`, `src/App.tsx`, the router file, the shared API client |
| hub-app | `src/app/_layout.tsx`, `src/components/app-tabs.tsx`, the shared API client |

In shared files, add only what your module needs (ideally one line), and do not rewrite other people's lines.

## 3. Branches

Branch name format: `dev.<name>/<Module>_<Feature-Name>`

```
dev.ibrahim/E-Commerce_Cart-Total
dev.hassaan/Drive_Ride-Acceptance
dev.siddique/Food_Menu-Items
```

Each person has one **merge branch** that collects all their feature branches:

```
dev.ibrahim/E-Commerce_Merge
dev.hassaan/Drive_Merge
dev.siddique/Food_Merge
```

The flow:

```
your feature branches  ->  your _Merge branch  ->  development  ->  main
```

- Feature branches go into **your own `_Merge` branch**, never straight into `development`.
- Your `_Merge` branch goes into `development` when a feature is finished and tested.
- `development` goes into `main` only after the whole team has tested it together.
- Nobody pushes directly to `development` or `main`. Always use a pull request.
- Work that belongs to everyone (shared tables, shared screens, these rules) uses a
  `Shared_` branch, for example `dev.ibrahim/Shared_Team-Workflow`. Tell the team first;
  it goes straight into `development`.

## 4. The one habit that prevents conflicts

**Whenever someone merges into `development`, everyone else pulls it into their `_Merge` branch.**

```powershell
git checkout dev.<name>/<Module>_Merge
git pull origin development
git push
```

This takes about a minute. It does **not** undo or restart your work; Git adds your
teammate's new code next to yours. If Git reports a conflict, it will be small because
only a few days of changes are involved. Fix it, commit, push.

Why: if everyone works alone for weeks and merges at the end, the shared files collide
all at once and take hours to fix.

## 5. Everyday steps

Start a new feature:

```powershell
git checkout dev.<name>/<Module>_Merge
git pull origin development
git checkout -b dev.<name>/<Module>_<Feature-Name>
```

Save and upload your work (as often as you like):

```powershell
git add <files>
git commit -m "Add product search by name"
git push -u origin dev.<name>/<Module>_<Feature-Name>
```

Finish a feature:

1. On GitHub, open a pull request: your feature branch -> your `_Merge` branch. Merge it.
2. Test your `_Merge` branch.
3. Open a pull request: your `_Merge` branch -> `development`. Tell the team when it is merged.
4. Everyone else does step 4 above (pull `development`).

Merge each finished feature (cart, orders, ...) right away. Do not wait until the whole module is finished.

## 6. Where to put your code

### hub-backend (ASP.NET Core)

| What | Folder |
|---|---|
| Database classes | `Models/<Module>/` |
| Request/response classes (DTOs) | `Contracts/<Module>/` |
| Business logic | `Services/<Module>/` |
| API controllers | `Controllers/<Module>/` (existing Drive controllers may stay where they are) |
| Table mappings | `Data/Configurations/<Module>/` (one `IEntityTypeConfiguration` file per table) |
| Tests | `tests/Hub.<Module>Checks/` |

- C# namespaces follow the folders: `HUB.Backend.Services.Marketplace`.
- Register your module's services with one line in `Program.cs`, e.g. `builder.Services.AddMarketplace();`,
  using an extension method inside your module folder.
- API routes: `api/drive/...`, `api/food/...`, `api/marketplace/...`. Admin routes: `api/admin/<module>/...`.

### hub-frontend (React website)

| What | Folder |
|---|---|
| Your pages, components and API calls | `src/features/<module>/` (`drive`, `food`, `marketplace`) |
| Shared code (API client, login state, common UI) | `src/shared/` |

### hub-app (Expo mobile app)

| What | Folder |
|---|---|
| Screens (every file is a route) | `src/app/(<module>)/`, e.g. `src/app/(marketplace)/cart.tsx` |
| Your components, hooks and API calls | `src/features/<module>/` |
| Shared code | `src/components/`, `src/hooks/`, `src/shared/` |

Only screens go inside `src/app/`. Everything else goes outside it.

## 7. Naming

| Thing | Rule | Example |
|---|---|---|
| C# classes, files | PascalCase, file name = class name | `ProductService.cs` |
| React components | PascalCase file | `ProductCard.tsx` |
| Other TS files, app screens | kebab-case | `use-cart.ts`, `order-details.tsx` |
| Database tables | snake_case, plural, module prefix from the ER design | `marketplace_orders`, `food_orders` |
| Database columns | snake_case | `stock_quantity` |
| JSON fields | camelCase | `stockQuantity` |
| EF migrations | `<Module>_<What>` | `Marketplace_AddProductCatalog` |
| Money | `numeric(12,2)` plus a `currency` column; never float | |
| Commit messages | Short, plain English, says what changed | `Add cart quantity update` |

## 8. Database changes (backend)

1. Read `docs/ER Diagrams/Data_Dictionary.md` and `Database_Constraints.md` first.
2. **Shared tables** (`users`, `roles`, `user_roles`, `sessions`, `user_addresses`,
   `service_engagements`, `engagement_status_history`, `transactions`, `payments`,
   `payment_events`, `payment_status_history`, `reviews`, `notifications`, `device_tokens`,
   `audit_entries`, recommendation tables) are changed only on a `Shared_` branch that the
   team has agreed. Never change them inside a module branch.
3. Role IDs are fixed for everyone: Customer=1, Driver=2, Administrator=3. New roles get the
   next number only on a `Shared_` branch, so two people never pick the same ID.
4. Before creating a migration: `git pull origin development` first.
5. If someone else's migration reaches `development` before yours: delete your migration,
   pull `development`, and create it again. **Never hand-edit `HubDbContextModelSnapshot.cs`.**
6. One migration per feature branch where possible.

## 9. Never do this

- Never push directly to `development` or `main`.
- Never commit passwords, connection strings, JWT keys or API keys. Use User Secrets / environment variables.
- Never commit `bin/`, `obj/`, `node_modules/` or `dist/`.
- Never change another person's module without asking them.
- Never force-push a branch that other people use (`development`, `main`, anyone's `_Merge`).
- No AI co-author or "generated by" lines in commit messages.
