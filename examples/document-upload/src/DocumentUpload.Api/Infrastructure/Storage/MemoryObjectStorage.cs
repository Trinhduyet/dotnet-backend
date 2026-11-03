using DocumentUpload.Api.Common.Errors;

namespace DocumentUpload.Api.Infrastructure.Storage;

public sealed class MemoryObjectStorage : IObjectStorage
{
    private readonly Dictionary<string, byte[]> _objects = new(StringComparer.Ordinal);
    private readonly object _gate = new();

    public bool FailNextWrite { get; set; }
    public bool FailAfterNextWrite { get; set; }
    public bool ThrowUnexpectedOnNextWrite { get; set; }
    public bool FailNextDelete { get; set; }
    public Action? AfterNextWrite { get; set; }

    public int ObjectCount
    {
        get { lock (_gate) return _objects.Count; }
    }

    public async Task SaveAsync(string objectKey, Stream content, CancellationToken cancellationToken)
    {
        if (FailNextWrite)
        {
            FailNextWrite = false;
            throw new ObjectStorageUnavailableException("Simulated storage failure.");
        }

        if (ThrowUnexpectedOnNextWrite)
        {
            ThrowUnexpectedOnNextWrite = false;
            throw new InvalidOperationException("Synthetic internal failure.");
        }

        await using var buffer = new MemoryStream();
        await content.CopyToAsync(buffer, cancellationToken);
        lock (_gate)
        {
            _objects[objectKey] = buffer.ToArray();
        }

        var callback = AfterNextWrite;
        AfterNextWrite = null;
        callback?.Invoke();
        cancellationToken.ThrowIfCancellationRequested();

        if (FailAfterNextWrite)
        {
            FailAfterNextWrite = false;
            throw new ObjectStorageUnavailableException("Simulated failure after a partial write.");
        }
    }

    public Task DeleteAsync(string objectKey, CancellationToken cancellationToken)
    {
        cancellationToken.ThrowIfCancellationRequested();
        if (FailNextDelete)
        {
            FailNextDelete = false;
            throw new ObjectStorageUnavailableException("Simulated cleanup failure.");
        }

        lock (_gate)
        {
            _objects.Remove(objectKey);
        }

        return Task.CompletedTask;
    }
}
