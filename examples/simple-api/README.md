# Simple API example

Runnable ASP.NET Core controller → service → EF Core `DbContext` CRUD slice.
The sample uses SQLite at runtime and a test-only in-memory provider. It shows
request/response contracts, automatic `[ApiController]` validation, `ProblemDetails`,
DI, async database calls, cancellation propagation and an HTTP behavior test.

From the toolkit root, run `dotnet test examples/simple-api/tests/SimpleApi.Tests/SimpleApi.Tests.csproj -c Release`.
For a local API process, change to `examples/simple-api/src/SimpleApi`, provision the
demo database with `sqlite3 items.db < ../../database/schema.sql`, then run
`dotnet run`; POST
`{"name":"Widget"}` to `/api/items` then GET the returned `/api/items/{id}`.
The SQLite schema is a local demo; this is not a production schema or auth template.
