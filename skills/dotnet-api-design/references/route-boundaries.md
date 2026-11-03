# Route ownership and upload contracts

## Admin versus Public (or equivalent)

1. Assign every endpoint an owner: Admin, Public, internal, or another named surface.
2. Public routes return only intentionally published, safe-to-disclose data.
3. Admin routes require the project's actual authentication and authorization
   configuration. Do not invent providers or hardcode tenant identities.
4. Route prefixes (`/api/admin`, `/api/public`) document intent; they are not a
   substitute for authorization middleware and policy checks.
5. Do not expose schema or category management under Public merely because the
   verb is GET.

**Incorrect:**

```csharp
[Route("api/public/categories")]
public sealed class CategoriesPublicController : ControllerBase
{
    [HttpGet] // returns full admin management fields
    public Task<IReadOnlyList<CategoryAdminDto>> List(CancellationToken ct) => categories.ListAdminAsync(ct);
}
```

**Correct shape:**

```csharp
[Authorize(Policy = "Admin")]
[Route("api/admin/categories")]
public sealed class CategoriesAdminController : ControllerBase { /* management DTOs */ }

[Route("api/public/categories")]
public sealed class CategoriesPublicController : ControllerBase
{
    [HttpGet]
    public Task<IReadOnlyList<CategoryPublicDto>> ListPublished(CancellationToken ct)
        => categories.ListPublishedAsync(ct);
}
```

Test anonymous access to Admin routes (expect challenge/forbid per contract) and
assert Public responses omit internal fields.

## Multipart uploads

- Bind forms and set total-request/form limits at the Controller/HTTP edge before model
  binding. Use `IFormFile` only for deliberately small buffered uploads; account for
  temporary disk/memory under concurrent requests. Larger uploads need a streaming
  endpoint with an enforced byte counter while reading.
- Validate the contract's extension/content rules and per-file maximum in the application
  service; a client MIME value or file name is not proof of content. Generate the stored
  object key on the server.
- Persist metadata and blob bytes through one cohesive application-service operation.
  A blob plus SQL database is not one atomic transaction: record every successful side
  effect, compensate on later failure, use a bounded cleanup token after request abort,
  and log cleanup failure for reconciliation without replacing the original error.
- Map validation failures to 400, missing resources to 404, conflicts to 409/412,
  known storage/dependency outages to 503, and unexpected defects to generic 500.
  Do not relabel cancellation as unavailability or treat a missing dependency as an
  empty successful collection.
- Keep request DTOs/forms outside `Services/` when using DTO folders.

See the complete, tested sample at
[examples/document-upload](../../../examples/document-upload/README.md). Microsoft
documents the difference between buffered `IFormFile` and streaming uploads in its
[ASP.NET Core file upload guidance](https://learn.microsoft.com/aspnet/core/mvc/models/file-uploads).

Health routes remain consumer-owned. A single `GET /health` is acceptable when
approved; readiness splits are optional requirements, not toolkit mandates.
