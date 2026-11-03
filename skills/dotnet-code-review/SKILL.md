---
name: dotnet-code-review
description: Review .NET and ASP.NET Core source changes or pull requests for concrete correctness, security, data integrity, API compatibility, reliability and performance defects. Use for reviews, not implementation or style-only rewrites.
---

# .NET code review

Read consumer instructions, active decisions, intended contracts, diff and callers.
Preserve approved architecture. Review is read-only unless corrections are requested.
Current code is evidence, not automatic authority to erase an intended contract.

Prioritize correctness, security/data ownership, data integrity/API compatibility,
architecture boundaries, reliability/performance, then maintenance/test gaps.
Trace binding → policy → Service → query/external boundary → response. Check
overposting, sensitive DTOs/logs, DI lifetime capture, cancellation, transactions,
bounded queries/N+1, decimal mapping and schema upgrade compatibility.
For multipart uploads trace binding/total-body limits, per-file limits, extension and
content checks, generated storage keys, coordination across blob/SQL writes, rollback
after partial failure, cancellation and cleanup failure logging. Check that only known
dependency failures map to 503; cancellation stays cancellation and unexpected errors
remain generic 500 responses. For YARP, inspect effective methods as well as paths,
destination source and forwarded headers. Require HTTP binding evidence before calling
a `*Request`-named class a transport DTO.
For proxy/container work inspect effective config and service networks: localhost
inside a container is that container. Build success is not deployed readiness.

Findings contain severity, file/line, concrete failure trigger and impact, minimal
correction, and evidence/test. P0 is critical immediate impact; P1 high, P2 normal,
P3 low. Label uncertainty, not speculation as confirmed bugs. Do not invent defects
or complain about style without impact. Avoid unrelated rewrites/forced patterns.
Do not flag lean Controller → Service → DbContext, intentional no-physical-FK with
consistent service checks, a single approved `/health`, or consistent alternate DTO
folders as defects. Read [classifications](references/classifications.md) when
severity/non-finding boundaries are unclear. Report actual executed checks and
uncovered areas separately; never claim a test passed from reading it. Security
review remains part of this workflow.
