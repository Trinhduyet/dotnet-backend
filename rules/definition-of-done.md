# Definition of done

A task is complete when its applicable obligations have evidence:

- Requested behavior is implemented and the diff is scoped.
- Source builds and relevant tests pass; blocked/skipped checks and their effect
  on readiness are explicitly reported. A failed mandatory check remains unresolved.
- Security implications and authorization/data boundaries were reviewed.
- Changed HTTP/database contracts and their owning docs are synchronized.
- No unrelated architectural layers, dependencies or speculative files were added.
- The applicable consumer completion gate ran, with its
  command and result recorded. Report runner skips separately from executed passes.
- Durable project decisions/baselines are updated when changed; otherwise memory
  is left alone. Do not put command logs or secrets in project memory.

Documentation-only changes require policy/link/script checks and diff review,
not the full .NET suite. Changes to copyable code examples require compiling and
testing those examples. A local gate does not establish deployed, SQL Server,
external-provider, E2E or load readiness unless those separate checks actually ran.
