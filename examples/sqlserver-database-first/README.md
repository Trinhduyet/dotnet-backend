# SQL Server database-first example

`database/schema.sql` is the canonical schema. `CatalogDbContext` maps that schema;
it does not create or migrate it. Deploy the reviewed SQL script separately in each
environment using that environment's deployment identity and change process. Supply
`ConnectionStrings:Catalog` through protected environment configuration. The API
fails fast when the setting is absent and never runs `EnsureCreated`, `Migrate`, or
SQL DDL at startup. EF Core is used for runtime queries only.

Build with `dotnet build examples/sqlserver-database-first/src/DatabaseFirst/DatabaseFirst.csproj -c Release`.
A reachable SQL Server and provisioned schema are required to run the API; this sample
does not claim a live SQL Server integration test. Keep schema ownership, provisioning,
upgrade/rollback scripts, and runtime connectivity as distinct operational concerns.

The HTTP test substitutes EF Core InMemory to exercise routing, DI and projection.
It seeds from the built test host (no second service provider) and asserts mapping
metadata, but cannot verify SQL Server collation, decimal or transactional behavior.
