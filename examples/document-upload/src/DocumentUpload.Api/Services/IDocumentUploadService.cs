using DocumentUpload.Api.DTOs.Requests;
using DocumentUpload.Api.DTOs.Responses;

namespace DocumentUpload.Api.Services;

public interface IDocumentUploadService
{
    Task<DocumentResponse> UploadAsync(UploadDocumentForm form, CancellationToken cancellationToken);

    Task<DocumentResponse?> GetAsync(Guid id, CancellationToken cancellationToken);
}
