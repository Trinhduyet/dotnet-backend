using System.Net;
using System.Net.Http.Headers;
using DocumentUpload.Api.Infrastructure.Storage;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Xunit;

namespace DocumentUpload.Tests;

public sealed class UploadTests : IClassFixture<WebApplicationFactory<Program>>
{
    private readonly WebApplicationFactory<Program> _factory;

    public UploadTests(WebApplicationFactory<Program> factory)
    {
        _factory = factory;
    }

    [Fact]
    public async Task Upload_valid_pdf_returns_created()
    {
        using var client = _factory.CreateClient();
        using var content = BuildMultipart("note.pdf", "application/pdf", "hello"u8.ToArray(), $"Issuance-{Guid.NewGuid():N}");
        var response = await client.PostAsync("/api/documents", content);
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
    }

    [Fact]
    public async Task Upload_invalid_extension_returns_bad_request()
    {
        using var client = _factory.CreateClient();
        using var content = BuildMultipart("note.exe", "application/octet-stream", "hello"u8.ToArray(), $"Bonds-{Guid.NewGuid():N}");
        var response = await client.PostAsync("/api/documents", content);
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task Upload_excessive_size_returns_bad_request()
    {
        var factory = _factory.WithWebHostBuilder(builder =>
        {
            builder.ConfigureAppConfiguration((_, config) =>
            {
                config.AddInMemoryCollection(new Dictionary<string, string?>
                {
                    ["Upload:MaxBytes"] = "4",
                });
            });
        });

        using var client = factory.CreateClient();
        using var content = BuildMultipart("note.txt", "text/plain", "too-large"u8.ToArray(), $"Notes-{Guid.NewGuid():N}");
        var response = await client.PostAsync("/api/documents", content);
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task Upload_storage_failure_returns_service_unavailable()
    {
        using var client = _factory.CreateClient();
        _factory.Services.GetRequiredService<MemoryObjectStorage>().FailNextWrite = true;
        try
        {
            using var content = BuildMultipart("note.txt", "text/plain", "hello"u8.ToArray(), $"Storage-{Guid.NewGuid():N}");
            var response = await client.PostAsync("/api/documents", content);
            Assert.Equal(HttpStatusCode.ServiceUnavailable, response.StatusCode);
        }
        finally
        {
            _factory.Services.GetRequiredService<MemoryObjectStorage>().FailNextWrite = false;
        }
    }

    [Fact]
    public async Task Health_returns_ok()
    {
        using var client = _factory.CreateClient();
        var response = await client.GetAsync("/health");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    private static MultipartFormDataContent BuildMultipart(
        string fileName,
        string contentType,
        byte[] bytes,
        string categoryType)
    {
        var file = new ByteArrayContent(bytes);
        file.Headers.ContentType = new MediaTypeHeaderValue(contentType);
        var form = new MultipartFormDataContent
        {
            { file, "File", fileName },
            { new StringContent(categoryType), "CategoryType" },
        };
        return form;
    }
}
