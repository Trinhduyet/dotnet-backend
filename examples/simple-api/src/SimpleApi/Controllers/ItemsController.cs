using Microsoft.AspNetCore.Mvc;
using SimpleApi.DTOs.Requests;
using SimpleApi.DTOs.Responses;
using SimpleApi.Services;

namespace SimpleApi.Controllers;

[ApiController]
[Route("api/items")]
public sealed class ItemsController(IItemsService service) : ControllerBase
{
    [HttpGet("{id:int}")]
    public async Task<ActionResult<ItemResponse>> Get(int id, CancellationToken cancellationToken)
    {
        var item = await service.GetAsync(id, cancellationToken);
        return item is null ? NotFound() : Ok(item);
    }

    [HttpPost]
    public async Task<ActionResult<ItemResponse>> Create(CreateItemRequest request, CancellationToken cancellationToken)
    {
        var item = await service.CreateAsync(request, cancellationToken);
        return CreatedAtAction(nameof(Get), new { id = item.Id }, item);
    }
}
