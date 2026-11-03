using Microsoft.EntityFrameworkCore;

namespace SimpleApi.Infrastructure.Database;

public sealed class ItemsDbContext(DbContextOptions<ItemsDbContext> options) : DbContext(options)
{
    public DbSet<Item> Items => Set<Item>();

    protected override void OnModelCreating(ModelBuilder modelBuilder) => modelBuilder.Entity<Item>(entity =>
    {
        entity.ToTable("Items");
        entity.HasKey(x => x.Id);
        entity.Property(x => x.Name).HasMaxLength(100).IsRequired();
    });
}

public sealed class Item { public int Id { get; set; } public required string Name { get; set; } }
