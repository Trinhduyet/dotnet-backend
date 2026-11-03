namespace DocumentUpload.Api.Infrastructure.Storage;

public interface IObjectStorage
{
    Task SaveAsync(string objectKey, Stream content, CancellationToken cancellationToken);

    Task DeleteAsync(string objectKey, CancellationToken cancellationToken);
}
