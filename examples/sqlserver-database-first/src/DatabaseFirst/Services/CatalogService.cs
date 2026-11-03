using DatabaseFirst.DTOs;
using DatabaseFirst.Infrastructure.Database;
using Microsoft.EntityFrameworkCore;

namespace DatabaseFirst.Services;

public sealed class CatalogService(CatalogDbContext db) : ICatalogService
{
    public async Task<IReadOnlyList<ProductResponse>> GetProductsAsync(int take, CancellationToken cancellationToken) =>
        await db.Products.AsNoTracking().OrderBy(p => p.Id).Take(take)
            .Select(p => new ProductResponse(p.Id, p.Name, p.Price)).ToListAsync(cancellationToken);
}
