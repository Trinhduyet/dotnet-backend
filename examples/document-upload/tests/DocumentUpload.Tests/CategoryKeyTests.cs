using DocumentUpload.Api.Configuration;
using DocumentUpload.Api.Common.Errors;
using DocumentUpload.Api.DTOs.Requests;
using DocumentUpload.Api.Infrastructure.Storage;
using DocumentUpload.Api.Services;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Options;
using Microsoft.Extensions.Logging.Abstractions;
using Xunit;

namespace DocumentUpload.Tests;

public sealed class CategoryKeyTests
{
    [Theory]
    [InlineData("Issuance", "ISSUANCE")]
    [InlineData(" issuance ", "ISSUANCE")]
    [InlineData("issuance", "ISSUANCE")]
    public void Normalize_collapses_case_and_whitespace(string input, string expected)
        => Assert.Equal(expected, CategoryKeys.Normalize(input));

    [Fact]
    public async Task Upload_rejects_case_variant_duplicates()
    {
        var storage = new MemoryObjectStorage();
        var service = new DocumentUploadService(storage, Options.Create(new UploadOptions
        {
            MaxBytes = 1024,
            AllowedExtensions = [".txt"],
        }), NullLogger<DocumentUploadService>.Instance);

        await service.UploadAsync(Form("Issuance"), CancellationToken.None);
        var ex = await Assert.ThrowsAsync<UploadValidationException>(
            () => service.UploadAsync(Form("issuance"), CancellationToken.None));
        Assert.Contains("already exists", ex.Message, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task Concurrent_duplicate_attempts_allow_only_one_success()
    {
        var storage = new MemoryObjectStorage();
        var service = new DocumentUploadService(storage, Options.Create(new UploadOptions
        {
            MaxBytes = 1024,
            AllowedExtensions = [".txt"],
        }), NullLogger<DocumentUploadService>.Instance);

        var tasks = Enumerable.Range(0, 8)
            .Select(_ => Task.Run(async () =>
            {
                try
                {
                    await service.UploadAsync(Form("SharedKey"), CancellationToken.None);
                    return true;
                }
                catch (UploadValidationException)
                {
                    return false;
                }
            }))
            .ToArray();

        var results = await Task.WhenAll(tasks);
        Assert.Equal(1, results.Count(succeeded => succeeded));
    }

    private static UploadDocumentForm Form(string categoryType)
    {
        var bytes = "hello"u8.ToArray();
        return new UploadDocumentForm
        {
            CategoryType = categoryType,
            File = new FormFile(new MemoryStream(bytes), 0, bytes.Length, "File", "note.txt")
            {
                Headers = new HeaderDictionary(),
                ContentType = "text/plain",
            },
        };
    }
}
