using DatabaseFirst.Infrastructure.Database;
using DatabaseFirst.Services;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);
builder.Services.AddProblemDetails();
builder.Services.AddDbContext<CatalogDbContext>(options =>
    options.UseSqlServer(builder.Configuration.GetConnectionString("Catalog")
        ?? throw new InvalidOperationException("ConnectionStrings:Catalog is required.")));
builder.Services.AddScoped<ICatalogService, CatalogService>();
builder.Services.AddControllers();
var app = builder.Build();
app.MapControllers();
app.Run();

public partial class Program;
