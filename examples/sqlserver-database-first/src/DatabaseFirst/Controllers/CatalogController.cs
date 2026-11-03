using DatabaseFirst.DTOs;
using DatabaseFirst.Services;
using Microsoft.AspNetCore.Mvc;

namespace DatabaseFirst.Controllers;

[ApiController]
[Route("api/catalog")]
public sealed class CatalogController(ICatalogService service) : ControllerBase
{
    [HttpGet("products")]
    public async Task<ActionResult<IReadOnlyList<ProductResponse>>> GetProducts([FromQuery] int take = 50, CancellationToken cancellationToken = default)
    {
        if (take is < 1 or > 100) return Problem(statusCode: 400, title: "take must be between 1 and 100.");
        return Ok(await service.GetProductsAsync(take, cancellationToken));
    }
}
