-- Canonical schema for this example. Apply through the environment's reviewed SQL deployment process.
CREATE SCHEMA catalog;
GO
CREATE TABLE catalog.Product
(
    Id int IDENTITY(1,1) NOT NULL CONSTRAINT PK_Product PRIMARY KEY,
    Name nvarchar(120) NOT NULL,
    Price decimal(18,4) NOT NULL
);
GO
