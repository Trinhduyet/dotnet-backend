using SimpleApi.DTOs.Requests;
using SimpleApi.DTOs.Responses;

namespace SimpleApi.Services;

public interface IItemsService
{
    Task<ItemResponse?> GetAsync(int id, CancellationToken cancellationToken);
    Task<ItemResponse> CreateAsync(CreateItemRequest request, CancellationToken cancellationToken);
}
