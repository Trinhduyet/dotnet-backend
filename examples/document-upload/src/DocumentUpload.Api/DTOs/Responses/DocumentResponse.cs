namespace DocumentUpload.Api.DTOs.Responses;

public sealed record DocumentResponse(Guid Id, string FileName, string CategoryType, long SizeBytes);
