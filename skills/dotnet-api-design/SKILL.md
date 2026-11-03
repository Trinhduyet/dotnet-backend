---
name: dotnet-api-design
description: Design or revise an ASP.NET Core HTTP contract, Controller, DTO, validation, ProblemDetails, pagination, OpenAPI or proxy boundary. Use for API contract decisions, not automatic architecture migrations or adding authentication frameworks.
---

# API design

Read existing routes, clients, versioning/security contracts and approved architecture.
Define request/response fields, validation, allowed action/record scope and failure
cases before implementation. Respect Controller/minimal API conventions. Business
rules remain in their owner; DTOs remain separate from database entities.

Specify consistent statuses/ProblemDetails without internal details. Separate invalid
input, missing resources, conflicts and unavailable dependencies. Version only for
a demonstrated compatibility need. Bound/filter/page lists when justified, with a
stable order and documented semantics. Map allowed inputs explicitly to avoid overposting.
Authentication and authorization differ; enforce ownership server-side.
Separate Admin and Public (or equivalent) surfaces explicitly; Public exposes only
published data. Keep multipart parsing/binding and HTTP size limits at the edge, then
delegate storage/persistence coordination and compensating cleanup to one cohesive
application service. Preserve cancellation while ensuring cleanup has its own bounded
token when it must run after request abort. Health paths follow the
consumer contract. Read [route boundaries](references/route-boundaries.md) for
Admin/Public and upload guidance.

Update the project's OpenAPI contract and existing OpenAPI/Scalar setup without
automatically adding a library. Test actual binding, JSON, statuses and errors.
HTTP clients need timeout, cancellation, bounded retries and understood idempotency.
YARP is optional where a proxy is required: keep server-selected destination allowlists,
prefix transforms, effective container addresses and authorization boundaries explicit.
Browser input must not choose arbitrary downstream URLs. Auth/proxy/deployment additions
require their own project decision and authorization.
