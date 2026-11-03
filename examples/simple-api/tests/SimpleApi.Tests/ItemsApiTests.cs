using System.Net;
using System.Net.Http.Json;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.Hosting;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Microsoft.Extensions.Hosting;
using SimpleApi.DTOs.Responses;
using SimpleApi.Infrastructure.Database;
using Xunit;

public sealed class ItemsApiTests : IClassFixture<ItemsFactory>
{
    private readonly HttpClient _client;
    public ItemsApiTests(ItemsFactory factory) => _client = factory.CreateClient();

    [Fact]
    public async Task Create_then_get_returns_resource_and_validation_problem()
    {
        var created = await _client.PostAsJsonAsync("/api/items", new { name = " Widget " });
        Assert.Equal(HttpStatusCode.Created, created.StatusCode);
        var item = await created.Content.ReadFromJsonAsync<ItemResponse>();
        Assert.NotNull(item);
        Assert.Equal("Widget", item.Name);
        Assert.Equal(HttpStatusCode.OK, (await _client.GetAsync($"/api/items/{item.Id}")).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await _client.GetAsync("/api/items/999")).StatusCode);
        var invalid = await _client.PostAsJsonAsync("/api/items", new { name = "" });
        Assert.Equal(HttpStatusCode.BadRequest, invalid.StatusCode);
        var whitespace = await _client.PostAsJsonAsync("/api/items", new { name = "   " });
        Assert.Equal(HttpStatusCode.BadRequest, whitespace.StatusCode);
    }
}

public sealed class ItemsFactory : WebApplicationFactory<Program>
{
    private readonly SqliteConnection _connection = new("Data Source=:memory:");

    public ItemsFactory() => _connection.Open();

    protected override void ConfigureWebHost(IWebHostBuilder builder) => builder.ConfigureServices(services =>
    {
        services.RemoveAll<DbContextOptions<ItemsDbContext>>();
        services.RemoveAll<IDbContextOptionsConfiguration<ItemsDbContext>>();
        services.AddDbContext<ItemsDbContext>(options => options.UseSqlite(_connection));
    });

    protected override IHost CreateHost(IHostBuilder builder)
    {
        var host = base.CreateHost(builder);
        using var scope = host.Services.CreateScope();
        scope.ServiceProvider.GetRequiredService<ItemsDbContext>().Database.EnsureCreated();
        return host;
    }

    protected override void Dispose(bool disposing)
    {
        if (disposing) _connection.Dispose();
        base.Dispose(disposing);
    }
}
