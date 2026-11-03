namespace DocumentUpload.Api.Configuration;

public sealed class UploadOptions
{
    public const string SectionName = "Upload";
    public const long MaxRequestBodyBytes = 5_242_880;
    public const long MaxFileBytes = MaxRequestBodyBytes - 65_536;

    public long MaxBytes { get; init; } = 1_048_576;

    public string[] AllowedExtensions { get; init; } = [];
}
