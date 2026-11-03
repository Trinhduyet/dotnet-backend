---
name: dotnet-development
description: Create a new ASP.NET Core/.NET backend application or implement and fix features in an existing one, with clear DTO boundaries, dependency injection, cancellation and meaningful verification. Use for new API/project creation and backend implementation requests, not review-only or infrastructure-only work.
---

# .NET development

1. Understand acceptance criteria. For an existing project, read consumer AGENTS.md,
   scoped instructions, approved decisions and contracts. Inspect Git status and
   affected source; preserve human edits. In a new project, inspect the available SDK
   and requirements before choosing an app shape or dependencies.
2. Identify actual architecture, DI lifetimes, HTTP/data boundaries and validation
   commands. For a new application without approved architecture, start with the
   smallest runnable API and a test project; Controller → Service → DTO is a useful
   default, with EF Core/DbContext only when persistence is required. Choose an SDK
   supported in the target environment. Do not assume SQL Server, authentication,
   Blob Storage, cloud deployment or additional layers without requirements.
   Design the smallest coherent change; plan only when useful. Common
   defaults never override approved business/security requirements. Surface conflicts
   and stop the affected action while continuing independent authorized work.
3. Implement in existing owners or create only the owners needed by the new feature.
   Controllers bind/authorize/map HTTP; Services own
   application logic; DTOs separate client input from persistence. DbContext may be
   injected directly. No interface-per-class, CQRS or repository mandate.
4. Keep multipart parsing, binding and transport-size limits at the HTTP edge. Move
   multi-step storage/database orchestration, rollback and cleanup into a cohesive
   application-service operation. Bind the real request DTO and test HTTP behavior.
   Treat file names/content types as untrusted; use bounded requests/streams and safe
   generated storage keys. Cleanup must remain possible after request cancellation.
   Map known dependency failures deliberately; let cancellation and unexpected errors
   preserve their meaning. Review any repository-owned upload example before file-flow
   work. Use constructor DI; avoid singleton/scoped capture.
5. Validate required options on startup. Use factory-managed HTTP clients with
   bounded timeout, cancellation and understood retry/idempotency behavior. Propagate
   CancellationToken through I/O; preserve nullability and dependency-failure versus
   valid-empty semantics. Keep transport DTOs outside service implementation files
   when the project uses DTO folders. Do not invent identity settings. Read
   [focused examples](references/examples.md) and
   [anti-patterns](references/anti-patterns.md) only when these patterns are needed.
6. Add meaningful behavior/regression tests. For a new app, verify it restores,
   builds, starts locally when feasible, and returns expected HTTP responses. Run
   applicable consumer format/build/test
   gates. A different provider's tests do not prove production semantics. Do not edit
   the harness to disguise an application failure.
7. Review the actual diff for scope, security and compatibility. Update owning docs
   and authorized durable repository decisions when changed; leave memory alone for
   trivial edits. Never write account/global AI memory as part of this lifecycle.
8. Report behavior, changed files, exact executed commands/results, skips/blockers
   and risks. Zero exit with zero executed tests is not a test pass.

Toolkit rules are shared defaults; consumer policies remain authoritative. This
skill grants no deployment, destructive Git, database reset or cross-repository
permission. For investigation use dotnet-debugging; for review use dotnet-code-review
when installed. Do not require another toolkit skill to complete ordinary work.
