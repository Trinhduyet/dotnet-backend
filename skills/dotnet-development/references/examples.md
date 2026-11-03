# Focused .NET patterns

Use these fragments in existing project owners; framework/packages remain project-selected.
For DTO-in-Services, thick uploads, identity options and uniqueness anti-patterns see
[anti-patterns](anti-patterns.md).

```csharp
public sealed class RenameRequest
{
    [System.ComponentModel.DataAnnotations.Required]
    [System.ComponentModel.DataAnnotations.StringLength(120)]
    public string Name { get; init; } = string.Empty;
}
```

```csharp
[Microsoft.AspNetCore.Mvc.HttpGet("{id:int}")]
public async Task<Microsoft.AspNetCore.Mvc.IActionResult> Get(int id, CancellationToken ct)
{
    var result = await service.GetAsync(id, ct);
    return result is null ? NotFound() : Ok(result);
}
```

```csharp
builder.Services.AddOptions<CatalogOptions>()
    .BindConfiguration("Catalog")
    .Validate(o => Uri.TryCreate(o.BaseUrl, UriKind.Absolute, out var uri)
        && uri.Scheme == "https", "Catalog BaseUrl must be an approved HTTPS URI")
    .ValidateOnStart();
builder.Services.AddScoped<CatalogService>();
builder.Services.AddHttpClient<CatalogClient>((services, client) =>
{
    var options = services.GetRequiredService<Microsoft.Extensions.Options.IOptions<CatalogOptions>>().Value;
    client.BaseAddress = new Uri(options.BaseUrl);
    client.Timeout = TimeSpan.FromSeconds(10);
});
```

Options live in Configuration; the HTTP wrapper and Service follow existing owners.
Apply destination allowlists/SSRF controls as well as URI syntax. Pass ct through
EF/HTTP calls and handle failed dependencies separately from legitimate empty results.
Do not wrap async I/O in Task.Run, .Wait or .Result. Use decimal and explicit
precision/currency for money. Normal class DTOs allow property validation in MVC;
positional records have different constructor-parameter validation requirements.
These are fragments, not a scaffolding engine. The full human CRUD exercise belongs
to the toolkit development guide and is not a dependency of an individually installed skill.
