# Architecture conventions

Default request flow:

```text
HTTP Request → Controller → Service → EF Core DbContext → SQL Server
```

Use this simple structure when starting a small API; preserve a valid existing
project's explicit architecture. Create only directories containing needed code.

```text
backend/
├── src/ProjectName.Api/
│   ├── Controllers/
│   ├── DTOs/Requests/
│   ├── DTOs/Responses/
│   ├── Services/
│   ├── Infrastructure/Database/
│   │   ├── Entities/
│   │   └── Configurations/
│   ├── Configuration/
│   ├── Common/Errors/
│   ├── Common/Extensions/
│   └── Program.cs
├── tests/
├── database/
├── docs/
└── README.md
```

This is a backend illustration. A monorepo may own docs and database at repository
root. Choose one owner for each contract; common does not move existing files.

| Area | Responsibility |
| --- | --- |
| Controllers | HTTP binding, authorization, Service calls and status/result mapping |
| Request DTOs | Client-supplied fields and syntax/range validation |
| Response DTOs | Explicit public output, separated from persistence models |
| Services | Business rules, data ownership and transaction orchestration |
| Entities/configurations/DbContext | SQL mapping and queries aligned with canonical schema |
| Configuration | Typed options and important startup option validation |
| Common | Small, used error/extension helpers |
| Program | DI and middleware composition; no production schema mutation |

Use built-in constructor DI. Concrete scoped Services and AddDbContext are the
default; introduce interfaces only for multiple implementations or a real boundary.
Never inject a scoped DbContext into a singleton or use one context concurrently.
Services may query DbContext directly. A read normally projects response DTOs,
uses AsNoTracking, has a stable sort and bounds results. Pass CancellationToken
through every I/O call. A single SaveChanges is adequate for a simple mutation;
multi-step invariants may need a deliberate transaction and concurrency strategy.

`[ApiController]` validates bound requests. Data annotations cover input shape;
Services enforce state-dependent rules. Missing rows normally yield 404; conflicts
yield 409/412 according to the project's API contract. Use ProblemDetails and central
handling for unexpected errors, without exposing SQL, stack traces or credentials.
Log useful structured context and correlation identifiers once at the owning boundary.

Authentication establishes identity; authorization constrains actions and records.
Apply endpoint policies and query/service ownership checks where needed. CORS and
UI guards do not establish authorization. Common selects no identity provider.
Keep credentials in the consumer's secret mechanism and validate important non-secret
settings. Test hosts must use isolated dependencies and avoid live log/notification sinks.
The checklist owner is [security rules](../rules/security.md).

Small APIs already have useful HTTP, business and persistence boundaries. Common
does not introduce Clean Architecture projects, CQRS, MediatR, generic repositories
or a Unit of Work wrapper over EF. It does not create Features/Application/Domain/
Repositories/Commands/Queries folders. These defaults do not prohibit adoption by
existing projects with a documented different layout. Reviewers must not treat that
lean choice as a missing-architecture defect.

Request/response records live outside `Services/` when the project uses DTO folders
(illustrated above). Another consistent contract location is acceptable when the
consumer deliberately owns it. Controllers may parse multipart fields and enforce
transport/request limits. A cohesive application-service operation owns multi-step
storage/database workflows, compensation and cleanup. Do not move HTTP binding into a
service merely to shorten a method.

Admin versus Public (or equivalent) APIs need explicit ownership. Public surfaces
publish only approved content; Admin surfaces use the project's real authn/authz.
Namespace-versus-folder naming mismatches (for example `Controllers.AdminApi` while
files sit under `Admin/`) are low priority unless they harm discovery or tooling.

SDK/framework/package selection is consumer-owned. Use a reviewed global.json and
explicit versions or central package management as the team chooses. The
[development example](development-guide.md) selects versions only for its reproducible
exercise. Database deployment conventions are owned by the [database guide](database-guide.md).
