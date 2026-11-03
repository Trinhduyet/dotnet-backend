using Microsoft.EntityFrameworkCore;
using SimpleApi.Infrastructure.Database;
using SimpleApi.Infrastructure.Errors;
using SimpleApi.Services;

var builder = WebApplication.CreateBuilder(args);
builder.Services.AddProblemDetails();
builder.Services.AddExceptionHandler<ProblemExceptionHandler>();
builder.Services.AddControllers();
builder.Services.AddDbContext<ItemsDbContext>(options =>
    options.UseSqlite(builder.Configuration.GetConnectionString("Items") ?? "Data Source=items.db"));
builder.Services.AddScoped<IItemsService, ItemsService>();
var app = builder.Build();
app.UseExceptionHandler();
app.MapControllers();
app.Run();

public partial class Program;
