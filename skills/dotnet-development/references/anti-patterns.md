# Practical anti-patterns and corrections

Fragments for existing owners. They are not a scaffolding engine and do not select
identity, schema strategy or folder layout for every consumer.

## A. Keep transport DTOs outside Services

**Incorrect** when the project already owns `DTOs/Requests` and `DTOs/Responses`:

```csharp
namespace Contoso.Api.Services;

public sealed record CreateItemRequest(string Name);
public sealed class ItemsService { /* ... */ }
```

**Correct** under that convention:

```csharp
namespace Contoso.Api.DTOs.Requests;
public sealed record CreateItemRequest(string Name);

namespace Contoso.Api.DTOs.Responses;
public sealed record ItemResponse(int Id, string Name);
```

If the consumer intentionally colocates contracts elsewhere, follow that consistent
convention instead of renaming folders for toolkit preference.

## C. Thin controllers for multipart uploads

Controllers bind the form, authorize and map HTTP results. Services validate file
type/size, sanitize names, write storage, persist metadata and propagate cancellation.

```csharp
[HttpPost]
[RequestSizeLimit(5_242_880)]
public async Task<IActionResult> Upload(
    [FromForm] UploadDocumentForm form,
    CancellationToken cancellationToken)
{
    var result = await documents.UploadAsync(form, cancellationToken);
    return CreatedAtAction(nameof(Get), new { id = result.Id }, result);
}
```

The toolkit checkout ships a companion sample named document-upload under examples
(not part of native skill install) covering valid upload, invalid type, oversized
content and storage failure.

## F. Keep identity provider settings consumer-owned

Common examples do not configure an identity provider. When a consumer has an approved
identity contract, validate its provider-specific options in that consumer and deliver
secrets through its approved secret mechanism. Do not invent tenant identifiers,
credentials, provider keys or authentication defaults in shared code.

## G. Canonicalize uniqueness keys

```csharp
public static string NormalizeCategoryType(string value)
    => value.Trim().ToUpperInvariant();
```

Validate uniqueness after normalization. Prefer a unique index (or equivalent) in
the approved schema workflow so concurrent writers cannot race past application checks.
Do not silently change intentional display casing.

## B. Prefer entity-owned content until localization proves otherwise

Start with titles/descriptions on the entity (or a simple translation column set)
when that satisfies requirements. Add ownership/reference tables only with demonstrated
localization reuse or lifecycle needs. Do not drop existing relationships without
integrity analysis. See the database skill schema-strategies reference.
