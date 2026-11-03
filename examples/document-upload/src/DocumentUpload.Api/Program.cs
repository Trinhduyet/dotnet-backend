using DocumentUpload.Api.Configuration;
using DocumentUpload.Api.Infrastructure;
using DocumentUpload.Api.Infrastructure.Storage;
using DocumentUpload.Api.Services;
using Microsoft.Extensions.Options;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers();
builder.Services.AddProblemDetails();
builder.Services.AddExceptionHandler<ApiExceptionHandler>();
builder.Services.AddSingleton<MemoryObjectStorage>();
builder.Services.AddSingleton<IObjectStorage>(sp => sp.GetRequiredService<MemoryObjectStorage>());
builder.Services.AddSingleton<IDocumentUploadService, DocumentUploadService>();
builder.Services.AddOptions<UploadOptions>()
    .BindConfiguration(UploadOptions.SectionName)
    .ValidateOnStart();
builder.Services.AddSingleton<IValidateOptions<UploadOptions>, UploadOptionsValidator>();

var app = builder.Build();
app.UseExceptionHandler();
app.MapControllers();
app.Run();

public partial class Program;
