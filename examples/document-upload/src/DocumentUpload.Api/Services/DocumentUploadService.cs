using DocumentUpload.Api.Common.Errors;
using DocumentUpload.Api.Configuration;
using DocumentUpload.Api.DTOs.Requests;
using DocumentUpload.Api.DTOs.Responses;
using DocumentUpload.Api.Infrastructure.Storage;
using Microsoft.Extensions.Options;

namespace DocumentUpload.Api.Services;

public sealed class DocumentUploadService(
    IObjectStorage storage,
    IOptions<UploadOptions> uploadOptions,
    ILogger<DocumentUploadService> logger) : IDocumentUploadService
{
    private readonly Dictionary<Guid, DocumentResponse> _documents = new();
    private readonly HashSet<string> _categoryTypes = new(StringComparer.Ordinal);
    private readonly object _gate = new();

    public async Task<DocumentResponse> UploadAsync(UploadDocumentForm form, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(form.File);

        var options = uploadOptions.Value;
        var extension = Path.GetExtension(form.File.FileName);
        if (string.IsNullOrWhiteSpace(extension)
            || !options.AllowedExtensions.Contains(extension, StringComparer.OrdinalIgnoreCase))
        {
            throw new UploadValidationException("File type is not allowed.");
        }

        if (form.File.Length <= 0 || form.File.Length > options.MaxBytes)
        {
            throw new UploadValidationException("File size is outside the allowed range.");
        }

        var categoryType = CategoryKeys.Normalize(form.CategoryType);
        if (string.IsNullOrWhiteSpace(categoryType))
        {
            throw new UploadValidationException("CategoryType is required.");
        }

        lock (_gate)
        {
            if (!_categoryTypes.Add(categoryType))
            {
                throw new UploadValidationException("Category type already exists.");
            }
        }

        var id = Guid.NewGuid();
        var safeName = $"{id:N}{extension.ToLowerInvariant()}";
        try
        {
            await using var stream = form.File.OpenReadStream();
            await storage.SaveAsync(safeName, stream, cancellationToken);
        }
        catch
        {
            using var cleanupTimeout = new CancellationTokenSource(TimeSpan.FromSeconds(3));
            try
            {
                await storage.DeleteAsync(safeName, cleanupTimeout.Token);
            }
            catch (Exception cleanupException)
            {
                logger.LogWarning(cleanupException, "Could not remove partial upload {ObjectKey}", safeName);
            }

            lock (_gate)
            {
                _categoryTypes.Remove(categoryType);
            }

            throw;
        }

        var response = new DocumentResponse(id, safeName, categoryType, form.File.Length);
        lock (_gate)
        {
            _documents[id] = response;
        }

        return response;
    }

    public Task<DocumentResponse?> GetAsync(Guid id, CancellationToken cancellationToken)
    {
        cancellationToken.ThrowIfCancellationRequested();
        lock (_gate)
        {
            return Task.FromResult(_documents.TryGetValue(id, out var document) ? document : null);
        }
    }
}
