using Microsoft.EntityFrameworkCore;
using SimpleApi.DTOs.Requests;
using SimpleApi.DTOs.Responses;
using SimpleApi.Infrastructure.Database;

namespace SimpleApi.Services;

public sealed class ItemsService(ItemsDbContext db) : IItemsService
{
    public async Task<ItemResponse?> GetAsync(int id, CancellationToken cancellationToken)
    {
        var item = await db.Items.AsNoTracking().SingleOrDefaultAsync(x => x.Id == id, cancellationToken);
        return item is null ? null : new ItemResponse(item.Id, item.Name);
    }

    public async Task<ItemResponse> CreateAsync(CreateItemRequest request, CancellationToken cancellationToken)
    {
        var entity = new Item { Name = request.Name.Trim() };
        db.Items.Add(entity);
        await db.SaveChangesAsync(cancellationToken);
        return new ItemResponse(entity.Id, entity.Name);
    }
}
