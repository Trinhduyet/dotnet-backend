---
name: dotnet-testing
description: Plan, implement or run isolated .NET unit, ASP.NET Core API integration, database, authorization and regression tests with execution evidence. Use for testing requests, not live load testing or unauthorised production probes.
---

# .NET testing

Read consumer testing instructions, changed behavior and SDK/runner setup. Identify
assertions, target and prerequisites. Respect architecture/security constraints;
do not change assertions or skip cases to hide defects.

| Boundary | Evidence |
| --- | --- |
| Pure logic/validation | Deterministic unit boundaries and invalid/null inputs |
| Routing/DI/JSON/status | WebApplicationFactory with actual HTTP requests |
| SQL/indexes/locking | Disposable actual-provider tests; Testcontainers where supported |
| External services | Contract test doubles including timeout, cancellation and failures |
| Auth when implemented | Allowed, denied, unauthenticated and cross-record cases |
| Bug | Regression exposing the trigger while preserving valid behavior |

Test observable behavior, not private implementation or artificial coverage targets.
Reset only isolated test-owned data. Missing Docker is BLOCKED, not a code failure.
SQLite/mocks do not prove SQL Server precision, collation, rowversion or locking.
Test hosts must not inherit live logging/notification sinks or production credentials.
Never fake an identity provider to claim live authentication proof.

Run focused tests, then applicable consumer gates. Native installation creates no
second application harness. E2E/load runners remain consumer-owned and explicitly
authorized for their target. Report command, scope and executed/failed/skipped totals:
PASS executed/assertions met; FAIL executed/failed; BLOCKED prerequisite missing;
SKIPPED deliberately excluded with reason. Zero tests is not passing evidence.
Stop dependent checks after prerequisite failure and state runtime/provider gaps.
