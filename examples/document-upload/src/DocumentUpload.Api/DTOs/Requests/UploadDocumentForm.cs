using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.Http;

namespace DocumentUpload.Api.DTOs.Requests;

public sealed class UploadDocumentForm
{
    [Required]
    public IFormFile? File { get; init; }

    [Required]
    [StringLength(64)]
    public string CategoryType { get; init; } = string.Empty;
}
