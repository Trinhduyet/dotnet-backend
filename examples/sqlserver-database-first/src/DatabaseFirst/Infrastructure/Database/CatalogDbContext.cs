using Microsoft.EntityFrameworkCore;

namespace DatabaseFirst.Infrastructure.Database;

public sealed class CatalogDbContext(DbContextOptions<CatalogDbContext> options) : DbContext(options)
{
    public DbSet<Product> Products => Set<Product>();

    protected override void OnModelCreating(ModelBuilder modelBuilder) => modelBuilder.Entity<Product>(entity =>
    {
        entity.ToTable("Product", "catalog");
        entity.HasKey(p => p.Id);
        entity.Property(p => p.Name).HasMaxLength(120).IsRequired();
        entity.Property(p => p.Price).HasPrecision(18, 4);
    });
}

public sealed class Product
{
    private Product() { }
    public Product(string name, decimal price) { Name = name; Price = price; }
    public int Id { get; private set; }
    public string Name { get; private set; } = "";
    public decimal Price { get; private set; }
}
