# Schema strategies and content models

## Database-first (primary toolkit illustration)

When the consumer approves database-first SQL scripts:

1. Reviewed SQL scripts are the schema source of truth.
2. Map EF Core entities and `IEntityTypeConfiguration` explicitly to that schema.
3. Do not add EF Migrations folders or `Database.Migrate` / auto-migrate startup
   behavior unless an ACTIVE decision explicitly allows a local-only exception.
4. Schema changes go through the project's approved SQL create/upgrade workflow.

```sql
-- database/schema.sql (illustration)
CREATE TABLE dbo.Categories (
    Id INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_Categories PRIMARY KEY,
    CategoryType NVARCHAR(64) NOT NULL,
    CONSTRAINT UQ_Categories_CategoryType UNIQUE (CategoryType)
);
```

```csharp
builder.Property(c => c.CategoryType).HasMaxLength(64).IsRequired();
builder.HasIndex(c => c.CategoryType).IsUnique();
```

## Code-first Migrations (valid when deliberately chosen)

Projects that deliberately use EF Migrations as their schema workflow are not
defective for that choice. Do not force database-first onto them. Still avoid
auto-migrate against shared/production catalogs at API startup unless explicitly
approved and controlled.

## Translation ownership

**Simple entity-owned model** (start here):

```csharp
public sealed class Category
{
    public int Id { get; set; }
    public string NameEn { get; set; } = string.Empty;
    public string NameEs { get; set; } = string.Empty;
}
```

**Normalized ownership/reference model** — only with demonstrated localization reuse
or lifecycle requirements (shared strings, many locales, publication workflows):

```csharp
public sealed class Translation { public int Id { get; set; } public string Locale { get; set; } = ""; public string Text { get; set; } = ""; }
public sealed class TranslationOwnership { public int OwnerId { get; set; } public string OwnerType { get; set; } = ""; public int TranslationId { get; set; } }
```

Do not add the normalized form by default. Do not remove existing relationships
without integrity and use-case analysis.

## Uniqueness and collation

Application normalization (for example `Trim` + invariant upper-case) helps, but
concurrent writers can still race. Pair it with a unique index or constraint in the
approved schema. Account for SQL Server collation: a case-insensitive collation may
already treat `Issuance` and `issuance` as equal; a case-sensitive one will not.
Regression-test mixed-case inserts against the real provider when practical.
