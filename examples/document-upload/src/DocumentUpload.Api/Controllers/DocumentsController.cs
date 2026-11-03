using DocumentUpload.Api.Configuration;
using DocumentUpload.Api.DTOs.Requests;
using DocumentUpload.Api.Services;
using Microsoft.AspNetCore.Mvc;

namespace DocumentUpload.Api.Controllers;

[ApiController]
[Route("api/documents")]
public sealed class DocumentsController(IDocumentUploadService documents) : ControllerBase
{
    [HttpPost]
    [RequestSizeLimit(UploadOptions.MaxRequestBodyBytes)]
    [RequestFormLimits(MultipartBodyLengthLimit = UploadOptions.MaxRequestBodyBytes)]
    public async Task<IActionResult> Upload([FromForm] UploadDocumentForm form, CancellationToken cancellationToken)
    {
        var created = await documents.UploadAsync(form, cancellationToken);
        return CreatedAtAction(nameof(Get), new { id = created.Id }, created);
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> Get(Guid id, CancellationToken cancellationToken)
    {
        var document = await documents.GetAsync(id, cancellationToken);
        return document is null ? NotFound() : Ok(document);
    }
}
