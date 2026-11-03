using System.Net;
using System.Net.Http.Json;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Microsoft.Extensions.Hosting;
using DatabaseFirst.DTOs;
using DatabaseFirst.Infrastructure.Database;
using Xunit;

public sealed class CatalogApiTests : IClassFixture<CatalogFactory>
{
    private readonly HttpClient _client;
    private readonly CatalogFactory _factory;

    public CatalogApiTests(CatalogFactory factory)
    {
        _factory = factory;
        _client = factory.CreateClient();
    }

    [Fact]
    public async Task Query_is_bounded_and_uses_configured_mapping()
    {
        Assert.Equal(HttpStatusCode.BadRequest, (await _client.GetAsync("/api/catalog/products?take=101")).StatusCode);
        var rows = await _client.GetFromJsonAsync<ProductResponse[]>("/api/catalog/products?take=2");
        Assert.NotNull(rows);
        Assert.Equal(2, rows.Length);
        Assert.Equal("Alpha", rows[0].Name);
        await using var scope = _factory.Services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<CatalogDbContext>();
        var property = db.Model.FindEntityType(typeof(Product))!.FindProperty(nameof(Product.Price))!;
        Assert.Equal(18, property.GetPrecision());
        Assert.Equal(4, property.GetScale());
    }
}

public sealed class CatalogFactory : WebApplicationFactory<Program>
{
    private readonly string _databaseName = $"catalog-tests-{Guid.NewGuid():N}";

    protected override void ConfigureWebHost(IWebHostBuilder builder) => builder.ConfigureServices(services =>
    {
        services.RemoveAll<DbContextOptions<CatalogDbContext>>();
        services.RemoveAll<IDbContextOptionsConfiguration<CatalogDbContext>>();
        services.AddDbContext<CatalogDbContext>(options => options.UseInMemoryDatabase(_databaseName));
    });

    protected override IHost CreateHost(IHostBuilder builder)
    {
        var host = base.CreateHost(builder);
        using var scope = host.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<CatalogDbContext>();
        db.Products.AddRange(new Product("Alpha", 12.3400m), new Product("Beta", 20.0000m), new Product("Gamma", 3.2500m));
        db.SaveChanges();
        return host;
    }
}
