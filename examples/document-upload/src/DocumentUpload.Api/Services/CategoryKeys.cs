namespace DocumentUpload.Api.Services;

public static class CategoryKeys
{
    public static string Normalize(string value)
        => value.Trim().ToUpperInvariant();
}
