using System.ComponentModel.DataAnnotations;

namespace SimpleApi.DTOs.Requests;

public sealed record CreateItemRequest(
    [Required, StringLength(100, MinimumLength = 1), RegularExpression(@".*\S.*", ErrorMessage = "Name cannot contain only whitespace.")]
    string Name);
