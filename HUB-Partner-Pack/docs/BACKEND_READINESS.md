# Backend readiness check - 19 October 2026

> Historical machine-specific snapshot, not current setup instructions. The review on 20 October 2026 did not repeat its runtime/database checks. Paths and addresses below belong to the original machine. Recheck your actual environment and source before following the old next-step advice.

## Scope and result

Read-only configuration inspection, a backend build, and a temporary HTTP smoke test were completed. No packages were installed, no database was created, and no migrations were applied. The backend starter runs; the PostgreSQL connection and EF Core foundation are not ready yet. These checks do not establish payment readiness.

## Verified results

| Area | Observation | Meaning |
|---|---|---|
| Backend location | `D:\Projects\hub-backend\HUB.Backend.csproj` | Separate sibling repository |
| .NET | SDK 10.0.401; ASP.NET Core runtime 10.0.12; target `net10.0` | Required backend runtime is installed |
| Build | `dotnet build --no-restore ../hub-backend/HUB.Backend.csproj` passed with zero warnings/errors | Existing starter compiles |
| Runtime | Temporary server on `http://127.0.0.1:5189`; GET `/weatherforecast` returned HTTP 200 and five records | Starter controller serves requests; this is not a database or payment test |
| PostgreSQL installation | `C:\Program Files\PostgreSQL\18\bin\psql.exe --version` reported 18.6 | PostgreSQL binaries are installed but not on this shell's PATH |
| PostgreSQL availability | `pg_isready.exe -h 127.0.0.1 -p 5432 -t 3` reported no response | No reachable server at this default local address; other hosts/ports were not ruled out |
| Local service/process | No matching PostgreSQL Windows service or running PostgreSQL process found | Installed binaries alone do not establish a configured running cluster |
| Connection configuration | No `ConnectionStrings` entries in either appsettings file; no matching database environment variables in the checked process; no `UserSecretsId` in the project | No database configuration was found in these inspected sources; external deployment configuration was not inspected |
| Data access | No EF Core/Npgsql package references, DbContext or migration directory found | Database integration is not implemented |
| Migration CLI | `dotnet tool list --global` and `dotnet tool list --local` showed no tools | `dotnet-ef` is not installed in either checked tool scope |

The temporary backend was stopped after the HTTP check. It used `--no-launch-profile` and HTTP loopback for this smoke test; startup selected Production and warned that HTTPS redirection had no HTTPS port. This does not verify development HTTPS or mobile-device connectivity.

## Methods and reproduction

Run from the frontend repository in PowerShell:

```powershell
dotnet --info
dotnet build --no-restore ../hub-backend/HUB.Backend.csproj
& 'C:\Program Files\PostgreSQL\18\bin\psql.exe' --version
& 'C:\Program Files\PostgreSQL\18\bin\pg_isready.exe' -h 127.0.0.1 -p 5432 -t 3
dotnet tool list --global
dotnet tool list --local
```

For the starter HTTP check, run this in one terminal:

```powershell
dotnet run --no-build --no-launch-profile --project ../hub-backend/HUB.Backend.csproj --urls http://127.0.0.1:5189
```

In another terminal:

```powershell
Invoke-WebRequest http://127.0.0.1:5189/weatherforecast -UseBasicParsing
```

Stop the temporary server with Ctrl+C. Service, process and port checks used PowerShell `Get-CimInstance Win32_Service`, `Get-Service`, `Get-Process` and `Get-NetTCPConnection`. Configuration inspection reported key names/presence without exposing credential values.

Building regenerates `bin/` and `obj/`. This backend repository currently tracks generated outputs, so build verification changes those files; no application source was edited or generated output committed.

## Next small step (not performed)

Frontend checks: `npx tsc --noEmit` passed. `npx expo lint` could not complete because ESLint/configuration are missing. The command automatically attempted dependency setup; it was stopped and its added package declarations were removed. No dependency/configuration setup is included in this task.

Confirm whether an existing PostgreSQL server/cluster is intended, including its host and port. If none exists, set up a local development server before configuring the backend connection. Do not infer a database name, create payment tables, or apply the ERD as migrations from this check.

The reviewed schema is available in [ER Diagrams/Data_Dictionary.md](ER%20Diagrams/Data_Dictionary.md) and [ER Diagrams/Database_Constraints.md](ER%20Diagrams/Database_Constraints.md). Those files describe the intended design, not runtime enforcement.
