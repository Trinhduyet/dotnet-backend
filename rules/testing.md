# Testing conventions

Test observable behavior and failure boundaries, not private method shape or artificial
coverage percentages. Keep tests deterministic and isolated. Use unit tests for pure
logic, WebApplicationFactory for HTTP/DI/JSON, actual-provider tests for SQL/concurrency,
and contract doubles for external services including failure/timeout/cancellation.

Test auth and data ownership when implemented. Do not invent providers or bypass
controls to claim live coverage. Testcontainers are optional with a functioning
engine and isolated lifecycle. Default tests must not notify live recipients or
mutate shared/production data.

Report scope, command, executed/failed/skipped totals and PASS/FAIL/BLOCKED/SKIPPED
with reasons. Zero tests is not a pass. Unit success does not certify startup, SQL
Server, deployment, browser or load readiness. Never remove tests, alter assertions
or suppress a required failure to obtain green output.
