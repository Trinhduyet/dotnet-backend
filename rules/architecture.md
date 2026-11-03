# Architecture and precedence

Task instructions, applicable consumer/scoped instructions, approved decisions,
business contracts and security constraints precede toolkit defaults. Code/tests
show implementation. Surface conflicts and stop the affected unsafe action while
continuing unrelated authorized work. Never weaken security or erase a contract to pass.

Controller → Service → DbContext is a small-API example, not a mandate. Respect approved
minimal APIs, BFF/provider boundaries or another valid layout. No forced interfaces,
Clean Architecture, CQRS, MediatR, repositories or fixed folder/project counts.
Create abstractions only for a current need; no empty folders or ownership migrations.
Absence of MediatR, generic repositories or a Unit of Work over EF Core is valid for
a lean Controller → Service → DbContext design and is not a defect by itself.
Do not split services by line count or labels alone. Trace the records, invariants,
queries and lifecycle they own; split only independent responsibilities that change
for different reasons or have distinct authorization/data boundaries. Likewise, a
Controller may own HTTP binding and form parsing, but storage/database workflows and
compensating cleanup belong in a cohesive application-service operation.

Separate Admin and Public (or equivalent) route ownership explicitly. Public routes
expose only intentionally published, safe-to-disclose data. Route naming alone is not
authorization. Do not expose schema/management endpoints under a public prefix merely
because they are GET. Enforce the project's configured authentication and authorization
on Admin routes; do not invent identity providers or hardcode tenant identities.

Health endpoints follow the consumer contract. A single `GET /health` is valid when
that is the approved foundation; do not reintroduce `/health/live` or `/health/ready`
without an explicit requirement.

SDK/packages, FK/schema policy, identity, environments, integrations, business rules
and memory remain consumer-owned. Skills grant no deployment/reset/force-push or
cross-repository permission. The consumer's existing gates remain authoritative.
When reviewing, do not flag lean Controller → Service → DbContext, intentional
absence of physical FKs with consistent service existence checks, or a single
approved `/health` endpoint as defects by themselves.
