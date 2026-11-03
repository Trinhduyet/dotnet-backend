using DatabaseFirst.DTOs;

namespace DatabaseFirst.Services;

public interface ICatalogService
{
    Task<IReadOnlyList<ProductResponse>> GetProductsAsync(int take, CancellationToken cancellationToken);
}
