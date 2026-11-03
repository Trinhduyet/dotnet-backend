# Database-first workflow

Default: SQL Server + EF Core, with consumer-owned canonical SQL describing the
desired deployed schema. EF entities/mappings must match it. Common contains no
project schema and performs no database deployment. API startup must not run
Database.Migrate, EnsureCreated, or schema scripts against production.

## Create a new local database

The consumer owns paths such as `database/schema.sql` (fresh create), optional
seed data, and `database/upgrades/` (reviewed changes for existing catalogs).
The paths below are examples to establish in that project; common does not ship them.

For a Windows local SQL Server using integrated authentication, select a disposable
database name such as ProductsLocal, then from the consumer root:

```sh
sqlcmd -b -S localhost -E -d master -Q "CREATE DATABASE [ProductsLocal]"
sqlcmd -b -S localhost -E -d ProductsLocal -i database/schema.sql
```

Choose your verified local server/certificate/authentication settings; for other
platforms use your approved sqlcmd connection method and secret delivery. Never
put passwords in command text or production credentials in local examples. The
create command is only for a new database, not an existing data-bearing catalog.
Configure the API's connection via user-secrets/platform secrets and start it only
after schema provisioning. Connectivity readiness does not audit schema compatibility.

## Synchronize EF mappings

For each approved schema change, update canonical SQL and corresponding entity/
IEntityTypeConfiguration: table/schema, keys, type/length/precision, nullability,
defaults, indexes, collation and concurrency tokens. Verify both on an isolated
SQL Server. Mapping-only tests do not prove actual constraints are deployed.

You may use manual mappings (the [Products example](development-guide.md)) or
reverse engineering into a temporary folder and review its diff. Install dotnet-ef
and EF Design matching your project's chosen EF version. With a configured named
connection and the project root selected, the built-in command is:

```sh
dotnet ef dbcontext scaffold Name=ConnectionStrings:AppDb Microsoft.EntityFrameworkCore.SqlServer --project backend/src/MyApi.Api --output-dir ScratchEntities --context-dir ScratchContext --no-onconfiguring
```

Use actual consumer paths and do not run with `--force` over customized code.
No connection string should enter generated source; use the named configuration
and `--no-onconfiguring` option. Review generated relationships carefully: absent
physical foreign keys do not reverse-engineer logical relationships automatically.
[EF reverse engineering](https://learn.microsoft.com/en-us/ef/core/managing-schemas/scaffolding/)
documents these options. Do not add a general scaffolding engine to common.

## Optional local migrations

An ACTIVE project decision may choose EF migrations for disposable local development.
Keep a dedicated local-only context/path/tool invocation and verify its target is
local and isolated. Review generated SQL for physical foreign keys and unintended
cascades. Every intended schema change still updates canonical SQL; migrations do
not become the production deployment source. Do not advertise a database-update
command as an environment upgrade or add an auto-migrate API startup switch.
Avoid parallel histories with unclear ownership. If local migrations are not chosen,
create a fresh disposable database from canonical SQL instead.

Projects that deliberately use code-first EF Migrations as their approved schema
workflow are outside the database-first illustration above. Do not force SQL-script
ownership onto them, and do not treat Migrations themselves as a universal defect.
In a database-first consumer, introducing Migrations as the schema source of truth
without an ACTIVE exception is a review finding.

## Content models and uniqueness

Prefer the simplest content model that meets requirements: titles and localized
fields on the entity until reuse, many locales or lifecycle workflows justify
separate translation ownership/reference tables. Do not remove existing relationships
without integrity analysis.

Canonicalize business keys used for uniqueness and back them with UNIQUE indexes
(or equivalent) in the approved SQL workflow. Application-only checks can race.
Collation determines whether `Issuance` and `issuance` collide; verify against the
actual SQL Server provider when practical.

## Detect drift and protect data

Test two distinct paths: create a clean database from canonical SQL; upgrade a
restored previous-version database containing representative data. Compare their
resulting metadata with expected schema and EF mappings. Inspect sys.tables,
sys.columns, sys.types, sys.indexes, constraints, defaults, collations and version/
deployment history owned by the consumer. Include provider tests for precision,
nullability, rowversion, locking, uniqueness and query translation.

Use a reviewed schema-compare tool or project-specific read-only metadata checks.
Do not auto-apply a generated difference report. Capture environment/revision and
the actual drift, without data dumps or secrets. SQLite tests can prove HTTP/basic
CRUD but cannot establish SQL Server collation, rowversion or locking semantics.

## Upgrade DEV, QA, UAT and Production

A canonical CREATE script is desired end state; it cannot safely upgrade an existing
production database containing data. Each existing-catalog upgrade needs reviewed
incremental SQL with preconditions, expected affected rows and verification queries.
Database creation and upgrades are different operator actions.

| Environment | Required procedure |
| --- | --- |
| Local disposable | Create canonical schema; optionally use explicitly chosen local migrations |
| Shared DEV | Identify actual catalog/baseline, review script, preserve others' data; no casual rebuild |
| QA | Rehearse upgrade from prior baseline with representative fixtures; verify app compatibility |
| UAT | Rehearse deployment/rollback, permissions, maintenance window and business checks |
| Production | Approved target/script, tested backup restore, write/concurrency plan, controlled operator execution |

Before each deployment: establish host/catalog and baseline; back up and test the
restore procedure; estimate data volume/lock duration; review destructive operations,
column conversions, defaults and backfills; record approval and rollback/fail-forward
plan. API credentials must not own schema-deployment permissions.

Prefer expand/contract: add compatible nullable columns/indexes, deploy compatible
code, backfill in bounded reviewed batches, verify completeness, then remove old
columns only in a later approved release. Stop writes where required and account
for background workers. No environment is upgraded simply because its name is DEV.

Scripts must fail on unmet preconditions and unexpected baseline. With sqlcmd use
`-b` so SQL errors fail the operator job. Transactional DDL with XACT_ABORT/TRY-CATCH
may help when appropriate, but not every operation is safely transactional or fast.
Re-run safety must be designed, not presumed. Record applied version/checksum and
post-checks; prevent rerunning incompatible/destructive scripts.

If a deployment fails, stop dependent application rollout and writes as planned,
capture the failing step, inspect transaction state, and choose approved rollback
or fail-forward. Schema reversal may lose newly written data; a backup restore is
not a lossless rollback unless the write window/recovery objectives permit it.
Do not drop/recreate production or silently retry. Verify restored/upgraded data,
constraints and app behavior before reopening traffic.

## Consumer-selected foreign-key policy

Foreign keys are neither required nor prohibited by this toolkit. Follow the
consumer's approved canonical schema and architecture decisions. If physical FKs
are used, map and test their enforcement/delete behavior explicitly; never remove
them as a generic cleanup. If the consumer chooses no physical FKs, PK, UNIQUE,
CHECK, NOT NULL and indexes still apply. That choice removes database-enforced
parent existence checks and delete cascades:
raw SQL, imports, concurrent deletes and new writers can create orphans.
EF navigation configuration is not a deployed integrity guarantee.

Services/importers must validate referenced records and ownership, define deletion
semantics, use transactions with locking/isolation adequate for concurrent races,
and coordinate every writer. A check followed by a write at ordinary isolation
alone may race with a parent deletion. Implement the project's explicit protection,
such as a common serialized transaction/lock protocol or retained soft-deleted parents.
Do not silently change the approved FK policy through optional local migrations.

Add reviewed orphan queries for each logical relationship, for example:

```sql
-- Illustration only: substitute the consumer's actual tables/key semantics.
SELECT child.Id
FROM dbo.ChildRows AS child
WHERE NOT EXISTS (SELECT 1 FROM dbo.ParentRows AS parent WHERE parent.Id = child.ParentId);
```

Schedule/read these through project-owned operations, investigate discrepancies,
and repair only approved affected rows after protecting data. Integrity tests must
exercise invalid references and concurrent writes/deletes. The policy script does
not verify live relational integrity, and no actual schema is generated by common.
