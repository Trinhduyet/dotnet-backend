using Microsoft.Extensions.Options;

namespace DocumentUpload.Api.Configuration;

public sealed class UploadOptionsValidator : IValidateOptions<UploadOptions>
{
    public ValidateOptionsResult Validate(string? name, UploadOptions options)
    {
        if (options.MaxBytes is <= 0 or > UploadOptions.MaxFileBytes)
        {
            return ValidateOptionsResult.Fail($"Upload:MaxBytes must be between 1 and {UploadOptions.MaxFileBytes}.");
        }

        if (options.AllowedExtensions is not { Length: > 0 }
            || options.AllowedExtensions.Any(extension =>
                string.IsNullOrWhiteSpace(extension)
                || extension[0] != '.'
                || extension.Length == 1
                || extension.Contains('/')
                || extension.Contains('\\')
                || extension.Contains(':'))
            || options.AllowedExtensions.Distinct(StringComparer.OrdinalIgnoreCase).Count() != options.AllowedExtensions.Length)
        {
            return ValidateOptionsResult.Fail("Upload:AllowedExtensions must be unique file extensions such as .pdf.");
        }

        return ValidateOptionsResult.Success;
    }
}
