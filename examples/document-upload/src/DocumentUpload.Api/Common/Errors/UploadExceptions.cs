namespace DocumentUpload.Api.Common.Errors;

public sealed class UploadValidationException(string message) : Exception(message);

public sealed class ObjectStorageUnavailableException(string message, Exception? innerException = null)
    : Exception(message, innerException);
