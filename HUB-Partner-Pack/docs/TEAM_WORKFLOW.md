# Shared development workflow

This document describes coordination between the React website, React Native Android/iOS app and ASP.NET Core backend. It does not assign people or prescribe rotation.

The first service module is HUB Drive. Identity, authorization and required database foundations support that module; its priority does not mean those foundations are already complete.

1. Read the shared requirements, decisions and relevant module/database documents. Inspect the code in the current repository.
2. Agree a small milestone and its acceptance checks. Record undecided business rules before depending on them.
3. Agree shared routes, request/response DTOs, authentication, role/ownership checks, lifecycle values and errors. Mark draft contracts as proposed.
4. Implement each client's UI against the same API contract. Clearly identify mock data and adapters.
5. Keep authoritative prices, permissions, lifecycle transitions and payment verification in the backend.
6. Integrate both clients. Check normal flow, validation, forbidden access, relevant retries/concurrency, loading/empty/error states and browser/Android/iOS behavior. Record untested platforms.
7. Update the module record with actual files, contract changes, migrations, configuration variable names, checks and limitations. Never put secret values into shared docs.

Use the [module record template](MODULE_HANDOFF_TEMPLATE.md) as needed. Preserve existing source and stable contracts when continuing another person's work. Keep shared documentation synchronized across code repositories; review API changes that affect both clients.
