---
name: dotnet-database
description: Change or review SQL Server and EF Core mappings, queries, transactions, concurrency or schema deployment in a .NET backend. Use for database work while preserving database-first ownership and the consumer's foreign-key policy.
---

# SQL Server and EF Core

Read canonical schema, EF mappings, decisions and deployment baseline. Distinguish
fresh create from existing-catalog upgrade. Do not introduce migrations into a
database-first project without a documented local decision or mutate production schema
at API startup. Respect code-first Migrations when that is the approved consumer
strategy. Prefer simple entity-owned localized fields until ownership/reference
tables are justified. Canonicalize uniqueness keys and pair them with schema
constraints where the strategy allows. Foreign keys are consumer-selected, never
globally forbidden or mandated. Read
[schema strategies](references/schema-strategies.md) when choosing models or
database-first versus Migrations.

Map table/schema, keys, SQL types, length/nullability, defaults and indexes explicitly.
Use decimal with precision/scale/currency for financial values. Choose UTC/offset/
date-only semantics deliberately. When FKs are absent, check every writer's parent
validation, orphan detection and transaction/locking protocol; check-then-write can race.

Inspect generated SQL/plans when performance matters. Project needed fields, use
no-tracking reads appropriately, bound results and propagate cancellation. Avoid N+1
and parallel operations on one DbContext. Index demonstrated query paths. Design
transactions/optimistic concurrency for actual races and the API conflict contract;
SQL Server rowversion/locking require actual-provider tests.

Update canonical SQL and mappings together, plus reviewed upgrades for data-bearing
catalogs. Test clean create and upgrade on disposable databases; protect data with
preconditions, backups/restore rehearsal and rollback/fail-forward plans. Separate
schema execution from app rollout. Report provider coverage independently from mocks/
SQLite and never auto-run scripts on shared environments.
Keep a runnable sample's SQL file canonical, map it explicitly in EF, and do not let
API startup provision or migrate the database. The toolkit repository also has an
executable sample, but copied skills remain usable without that repository.
