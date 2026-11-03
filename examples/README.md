# Executable examples

Run `dotnet test examples/Examples.slnx -c Release --nologo` to build and test all
examples. The solution contains:

- [Simple API](simple-api/README.md): small CRUD flow through Controller, Service and
  EF Core DbContext, with request validation, ProblemDetails and HTTP behavior tests
  using SQLite in memory.
- [SQL Server database-first](sqlserver-database-first/README.md): canonical SQL
  schema, explicit EF mapping and bounded query; tests use an isolated in-memory
  provider seeded through the actual application host and do not claim SQL Server behavior.
- [Document upload](document-upload/README.md): upload limits, options validation,
  typed errors and compensation in a testable service. Its memory storage is only a
  test/demo seam, not durable Blob or SQL integration.

The samples are independent and illustrative. They do not require common runtime
packages, pick a consumer identity provider, or establish deployment readiness.
