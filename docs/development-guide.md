# Add a small Products CRUD API

This complete exercise uses Controllers → concrete Service → EF Core DbContext.
It is a local learning consumer, not a production API or a generated common module.
Copy the files into a separate directory. Authentication/data ownership must be
implemented by the real consuming application before exposing business endpoints.
The example refuses non-development/non-test startup to make that boundary explicit.

## Create the exercise

These commands use an available .NET 10 SDK and `.slnx`. The versions below are
reproducible example choices, not a policy pin for every consumer. Choose compatible
supported versions for your project and review upgrades independently.

The explicit `System.Security.Cryptography.Pkcs 9.0.21` reference overrides the
SQL Server provider's older transitive version. It addresses the
[Microsoft PKCS advisory](https://github.com/dotnet/announcements/issues/468)
and [Windows decoding advisory](https://github.com/dotnet/announcements/issues/454).
Keep NuGet auditing enabled and review the full dependency graph at adoption time.

```sh
mkdir products-example
cd products-example
dotnet new sln -n Products
dotnet new web -f net10.0 -n Products.Api -o backend/src/Products.Api --no-restore
dotnet new xunit -f net10.0 -n Products.Tests -o backend/tests/Products.Tests --no-restore
dotnet sln Products.slnx add backend/src/Products.Api/Products.Api.csproj backend/tests/Products.Tests/Products.Tests.csproj
```

Replace generated Program/csproj files with the complete files below. Remove the
unused generated UnitTest1.cs in this disposable exercise. Create the listed
directories as you add their files. No interfaces, repositories or mediator needed.

### backend/src/Products.Api/Products.Api.csproj

```xml
<Project Sdk="Microsoft.NET.Sdk.Web">
  <PropertyGroup>
    <TargetFramework>net10.0</TargetFramework>
    <Nullable>enable</Nullable>
    <ImplicitUsings>enable</ImplicitUsings>
  </PropertyGroup>
  <ItemGroup>
    <PackageReference Include="Microsoft.EntityFrameworkCore.SqlServer" Version="10.0.12" />
    <PackageReference Include="System.Security.Cryptography.Pkcs" Version="9.0.21" />
  </ItemGroup>
</Project>
```

### backend/src/Products.Api/Infrastructure/Database/Entities/Product.cs

```csharp
namespace Products.Api.Infrastructure.Database.Entities;

public sealed class Product
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public decimal Price { get; set; }
}
```

### backend/src/Products.Api/Infrastructure/Database/Configurations/ProductConfiguration.cs

```csharp
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Products.Api.Infrastructure.Database.Entities;

namespace Products.Api.Infrastructure.Database.Configurations;

public sealed class ProductConfiguration : IEntityTypeConfiguration<Product>
{
    public void Configure(EntityTypeBuilder<Product> builder)
    {
        builder.ToTable("Products");
        builder.HasKey(p => p.Id);
        builder.Property(p => p.Id).ValueGeneratedOnAdd();
        builder.Property(p => p.Name).HasMaxLength(120).IsRequired();
        builder.Property(p => p.Price).HasPrecision(18, 2);
    }
}
```

### backend/src/Products.Api/Infrastructure/Database/ProductsDbContext.cs

```csharp
using Microsoft.EntityFrameworkCore;
using Products.Api.Infrastructure.Database.Entities;

namespace Products.Api.Infrastructure.Database;

public sealed class ProductsDbContext(DbContextOptions<ProductsDbContext> options)
    : DbContext(options)
{
    public DbSet<Product> Products => Set<Product>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(ProductsDbContext).Assembly);
    }
}
```

### backend/src/Products.Api/DTOs/Requests/ProductWriteRequest.cs

```csharp
using System.ComponentModel.DataAnnotations;

namespace Products.Api.DTOs.Requests;

public sealed class ProductWriteRequest(string name, decimal price)
{
    [Required, StringLength(120)]
    public string Name { get; init; } = name;

    [Range(typeof(decimal), "0.01", "99999999.99")]
    public decimal Price { get; init; } = price;
}
```

This class uses property validation metadata consistently in MVC and unit tests;
positional records have different constructor-parameter validation rules.
Create/update share the same allowed fields in this small example. The entity's
Id and internal state cannot be overposted. Range/length validation occurs before
the Service is called; state-dependent rules belong in the Service.

### backend/src/Products.Api/DTOs/Responses/ProductResponse.cs

```csharp
namespace Products.Api.DTOs.Responses;

public sealed record ProductResponse(int Id, string Name, decimal Price);
```

### backend/src/Products.Api/Services/ProductService.cs

```csharp
using Microsoft.EntityFrameworkCore;
using Products.Api.DTOs.Requests;
using Products.Api.DTOs.Responses;
using Products.Api.Infrastructure.Database;
using Products.Api.Infrastructure.Database.Entities;

namespace Products.Api.Services;

public sealed class ProductService(ProductsDbContext db)
{
    public Task<List<ProductResponse>> ListAsync(int limit, CancellationToken ct) =>
        db.Products.AsNoTracking().OrderBy(p => p.Id).Take(limit)
            .Select(p => new ProductResponse(p.Id, p.Name, p.Price)).ToListAsync(ct);

    public Task<ProductResponse?> GetAsync(int id, CancellationToken ct) =>
        db.Products.AsNoTracking().Where(p => p.Id == id)
            .Select(p => new ProductResponse(p.Id, p.Name, p.Price)).SingleOrDefaultAsync(ct);

    public async Task<ProductResponse> CreateAsync(ProductWriteRequest request, CancellationToken ct)
    {
        var product = new Product { Name = request.Name.Trim(), Price = request.Price };
        db.Products.Add(product);
        await db.SaveChangesAsync(ct);
        return new ProductResponse(product.Id, product.Name, product.Price);
    }

    public async Task<bool> UpdateAsync(int id, ProductWriteRequest request, CancellationToken ct)
    {
        var product = await db.Products.SingleOrDefaultAsync(p => p.Id == id, ct);
        if (product is null) return false;
        product.Name = request.Name.Trim();
        product.Price = request.Price;
        await db.SaveChangesAsync(ct);
        return true;
    }

    public async Task<bool> DeleteAsync(int id, CancellationToken ct)
    {
        var product = await db.Products.SingleOrDefaultAsync(p => p.Id == id, ct);
        if (product is null) return false;
        db.Products.Remove(product);
        await db.SaveChangesAsync(ct);
        return true;
    }
}
```

Each request has its own scoped DbContext. The mutation is one SaveChanges unit.
This exercise has no related records, uniqueness or edit-version contract. A real
project with concurrent editing must choose/test rowversion or another explicit
conflict contract; do not infer lost-update protection from this example.

### backend/src/Products.Api/Controllers/ProductsController.cs

```csharp
using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.Mvc;
using Products.Api.DTOs.Requests;
using Products.Api.DTOs.Responses;
using Products.Api.Services;

namespace Products.Api.Controllers;

[ApiController]
[Route("api/products")]
public sealed class ProductsController(ProductService service) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<List<ProductResponse>>> List(
        [FromQuery, Range(1, 100)] int limit = 20, CancellationToken ct = default) =>
        Ok(await service.ListAsync(limit, ct));

    [HttpGet("{id:int}")]
    public async Task<ActionResult<ProductResponse>> Get(int id, CancellationToken ct)
    {
        var product = await service.GetAsync(id, ct);
        return product is null ? NotFound() : Ok(product);
    }

    [HttpPost]
    public async Task<ActionResult<ProductResponse>> Create(ProductWriteRequest request, CancellationToken ct)
    {
        var product = await service.CreateAsync(request, ct);
        return CreatedAtAction(nameof(Get), new { id = product.Id }, product);
    }

    [HttpPut("{id:int}")]
    public async Task<IActionResult> Update(int id, ProductWriteRequest request, CancellationToken ct) =>
        await service.UpdateAsync(id, request, ct) ? NoContent() : NotFound();

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id, CancellationToken ct) =>
        await service.DeleteAsync(id, ct) ? NoContent() : NotFound();
}
```

### backend/src/Products.Api/Program.cs

```csharp
using Microsoft.EntityFrameworkCore;
using Products.Api.Infrastructure.Database;
using Products.Api.Services;

var builder = WebApplication.CreateBuilder(args);
if (!builder.Environment.IsDevelopment() && !builder.Environment.IsEnvironment("Testing"))
{
    throw new InvalidOperationException("This unauthenticated exercise is local/test only.");
}

builder.Services.AddControllers();
builder.Services.AddProblemDetails();
builder.Services.AddDbContext<ProductsDbContext>((services, options) =>
    options.UseSqlServer(services.GetRequiredService<IConfiguration>().GetConnectionString("AppDb")
        ?? throw new InvalidOperationException("Set ConnectionStrings:AppDb for local SQL Server.")));
builder.Services.AddScoped<ProductService>();

var app = builder.Build();
app.UseExceptionHandler();
app.UseStatusCodePages();
app.MapControllers();
app.Run();

public partial class Program;
```

No schema is applied at API startup. Unexpected exceptions produce safe 500
ProblemDetails; validation/missing routes produce 400/404. For manual local SQL Server
use, create a consumer-owned canonical schema aligned with the mapping, for example
an Id int IDENTITY key, Name nvarchar(120) NOT NULL and Price decimal(18,2) NOT NULL
with a positive-price CHECK. Provision it using the [database workflow](database-guide.md).
Initialize user-secrets with `dotnet user-secrets init --project backend/src/Products.Api`
and securely provide the `ConnectionStrings:AppDb` key. Run only on loopback:

```sh
dotnet run --project backend/src/Products.Api --environment Development --urls http://127.0.0.1:5080
```

Test requests can use curl or an HTTP client. The tests below need no SQL Server or
connection secrets; they replace the provider with isolated SQLite **in test setup**.

## Executable unit and API integration tests

### backend/tests/Products.Tests/Products.Tests.csproj

```xml
<Project Sdk="Microsoft.NET.Sdk">
  <PropertyGroup>
    <TargetFramework>net10.0</TargetFramework>
    <Nullable>enable</Nullable>
    <ImplicitUsings>enable</ImplicitUsings>
    <IsPackable>false</IsPackable>
    <IsTestProject>true</IsTestProject>
  </PropertyGroup>
  <ItemGroup>
    <PackageReference Include="Microsoft.NET.Test.Sdk" Version="17.14.1" />
    <PackageReference Include="xunit" Version="2.9.3" />
    <PackageReference Include="xunit.runner.visualstudio" Version="3.1.4" PrivateAssets="all" />
    <PackageReference Include="Microsoft.AspNetCore.Mvc.Testing" Version="10.0.12" />
    <PackageReference Include="Microsoft.EntityFrameworkCore.Sqlite" Version="10.0.12" />
  </ItemGroup>
  <ItemGroup>
    <ProjectReference Include="../../src/Products.Api/Products.Api.csproj" />
    <Using Include="Xunit" />
  </ItemGroup>
</Project>
```

### backend/tests/Products.Tests/ProductsFactory.cs

```csharp
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Microsoft.Extensions.Hosting;
using Products.Api.Infrastructure.Database;

namespace Products.Tests;

public sealed class ProductsFactory : WebApplicationFactory<Program>
{
    private readonly SqliteConnection _connection = new("Data Source=:memory:");

    public ProductsFactory() => _connection.Open();

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment("Testing");
        builder.ConfigureServices(services =>
        {
            services.RemoveAll<ProductsDbContext>();
            services.RemoveAll<DbContextOptions<ProductsDbContext>>();
            services.RemoveAll<IDbContextOptionsConfiguration<ProductsDbContext>>();
            services.AddDbContext<ProductsDbContext>(options => options.UseSqlite(_connection));
        });
    }

    protected override IHost CreateHost(IHostBuilder builder)
    {
        var host = base.CreateHost(builder);
        using var scope = host.Services.CreateScope();
        // Disposable test schema only, never an API production startup step.
        scope.ServiceProvider.GetRequiredService<ProductsDbContext>().Database.EnsureCreated();
        return host;
    }

    protected override void Dispose(bool disposing)
    {
        base.Dispose(disposing);
        if (disposing) _connection.Dispose();
    }
}
```

### backend/tests/Products.Tests/ProductTests.cs

```csharp
using System.ComponentModel.DataAnnotations;
using System.Net;
using System.Net.Http.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Products.Api.DTOs.Requests;
using Products.Api.DTOs.Responses;
using Products.Api.Infrastructure.Database;

namespace Products.Tests;

public sealed class ProductTests
{
    [Theory]
    [InlineData("", 10)]
    [InlineData("   ", 10)]
    [InlineData("Pen", 0)]
    [InlineData("Pen", -1)]
    public void Invalid_input_fails_validation(string name, int price)
    {
        var request = new ProductWriteRequest(name, price);
        Assert.False(Validator.TryValidateObject(request, new ValidationContext(request), [], true));
    }

    [Fact]
    public async Task Crud_round_trip_persists_and_returns_contract()
    {
        using var factory = new ProductsFactory();
        using var client = factory.CreateClient();
        var created = await client.PostAsJsonAsync("/api/products", new ProductWriteRequest(" Pen ", 12.50m));
        Assert.Equal(HttpStatusCode.Created, created.StatusCode);
        var product = Assert.IsType<ProductResponse>(await created.Content.ReadFromJsonAsync<ProductResponse>());
        Assert.Equal("Pen", product.Name);
        Assert.NotNull(created.Headers.Location);
        Assert.Equal($"/api/products/{product.Id}", created.Headers.Location!.AbsolutePath);

        using (var scope = factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<ProductsDbContext>();
            var row = await db.Products.AsNoTracking().SingleAsync();
            Assert.Equal(product.Id, row.Id);
            Assert.Equal(12.50m, row.Price);
        }

        var updated = await client.PutAsJsonAsync($"/api/products/{product.Id}", new ProductWriteRequest("Pencil", 4m));
        Assert.Equal(HttpStatusCode.NoContent, updated.StatusCode);
        var detail = await client.GetFromJsonAsync<ProductResponse>($"/api/products/{product.Id}");
        Assert.Equal("Pencil", detail!.Name);
        Assert.Equal(4m, detail.Price);
        var list = await client.GetFromJsonAsync<List<ProductResponse>>("/api/products?limit=1");
        Assert.Single(list!);
        Assert.Equal(HttpStatusCode.NoContent, (await client.DeleteAsync($"/api/products/{product.Id}")).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await client.GetAsync($"/api/products/{product.Id}")).StatusCode);
    }

    [Fact]
    public async Task Invalid_http_input_is_400_problem_details_and_does_not_write()
    {
        using var factory = new ProductsFactory();
        using var client = factory.CreateClient();
        var response = await client.PostAsJsonAsync("/api/products", new ProductWriteRequest("", 0));
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Equal("application/problem+json", response.Content.Headers.ContentType!.MediaType);
        Assert.Empty((await client.GetFromJsonAsync<List<ProductResponse>>("/api/products"))!);
        Assert.Equal(HttpStatusCode.BadRequest, (await client.GetAsync("/api/products?limit=101")).StatusCode);
    }

    [Fact]
    public async Task Missing_update_and_delete_are_404()
    {
        using var factory = new ProductsFactory();
        using var client = factory.CreateClient();
        Assert.Equal(HttpStatusCode.NotFound,
            (await client.PutAsJsonAsync("/api/products/999", new ProductWriteRequest("Pen", 1))).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await client.DeleteAsync("/api/products/999")).StatusCode);
    }
}
```

## Verify and adopt

```sh
dotnet restore Products.slnx
dotnet format Products.slnx
dotnet format Products.slnx --verify-no-changes --no-restore
dotnet build Products.slnx -c Release --no-restore
dotnet test Products.slnx -c Release --no-build --logger trx
node ../dotnet-backend-common/scripts/install.mjs --target .
node .backend-common/scripts/completion-gate.mjs --require-tests
```

Formatting the disposable copy accounts for the chosen SDK's code style. Tests
exercise DI startup, routing, JSON, validation, Service queries, EF persistence and
actual response codes. They do not establish SQL Server deployment, provider-specific
precision/concurrency, authorization, TLS, live E2E or external-service readiness.
[ASP.NET integration test documentation](https://learn.microsoft.com/en-us/aspnet/core/test/integration-tests)
describes the factory-based test host.

| Request | Expected result |
| --- | --- |
| POST valid name/price | 201, response DTO, Location to detail |
| GET list, limit 1–100 | 200, stable bounded list |
| GET existing ID | 200 DTO |
| PUT existing ID | 204, persisted fields changed |
| DELETE existing ID | 204, later GET 404 |
| Empty/whitespace name, invalid price/limit | 400 ProblemDetails, no invalid write |
| Missing GET/PUT/DELETE | 404 |

For a real feature, also update the consumer's canonical create schema, reviewed
existing-catalog upgrade, API contract and project tests. Add auth/data-level tests
using that consumer's policies. Keep those decisions and business behavior out of common.
