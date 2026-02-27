-- AlterTable
ALTER TABLE "WarrantyClaim" ADD COLUMN "replacementExternalInfo" TEXT;
ALTER TABLE "WarrantyClaim" ADD COLUMN "replacementItemId" TEXT;
ALTER TABLE "WarrantyClaim" ADD COLUMN "replacementProvidedAt" DATETIME;
ALTER TABLE "WarrantyClaim" ADD COLUMN "replacementReturnedAt" DATETIME;
ALTER TABLE "WarrantyClaim" ADD COLUMN "replacementType" TEXT;
ALTER TABLE "WarrantyClaim" ADD COLUMN "resolution" TEXT;
ALTER TABLE "WarrantyClaim" ADD COLUMN "resolvedAt" DATETIME;
ALTER TABLE "WarrantyClaim" ADD COLUMN "resolvedBy" TEXT;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "_prisma_migrations_old";
PRAGMA foreign_keys=on;

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Customer" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "contactName" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "address" TEXT,
    "taxId" TEXT,
    "salesRepLegacy" TEXT,
    "notes" TEXT,
    "isCustomer" BOOLEAN NOT NULL DEFAULT false,
    "isSupplier" BOOLEAN NOT NULL DEFAULT false,
    "isPartner" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "salesRepId" TEXT,
    CONSTRAINT "Customer_salesRepId_fkey" FOREIGN KEY ("salesRepId") REFERENCES "SalesRep" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Customer" ("address", "contactName", "createdAt", "email", "id", "isActive", "isCustomer", "isPartner", "isSupplier", "name", "notes", "phone", "taxId", "updatedAt") SELECT "address", "contactName", "createdAt", "email", "id", "isActive", "isCustomer", "isPartner", "isSupplier", "name", "notes", "phone", "taxId", "updatedAt" FROM "Customer";
DROP TABLE "Customer";
ALTER TABLE "new_Customer" RENAME TO "Customer";
CREATE TABLE "new_DeliveryOrder" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "orderNumber" TEXT NOT NULL,
    "deliveryAddress" TEXT,
    "saleType" TEXT NOT NULL DEFAULT 'DIRECT',
    "customerId" TEXT,
    "customerName" TEXT NOT NULL,
    "endCustomerId" TEXT,
    "endCustomerName" TEXT,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "totalAmount" REAL NOT NULL DEFAULT 0,
    "invoiceValue" REAL NOT NULL DEFAULT 0,
    "invoiceNumber" TEXT,
    "additionalCosts" REAL NOT NULL DEFAULT 0,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "quoteReference" TEXT,
    "salesRepId" TEXT,
    "builtById" TEXT,
    "buildNotes" TEXT,
    "builtAt" DATETIME,
    CONSTRAINT "DeliveryOrder_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "DeliveryOrder_endCustomerId_fkey" FOREIGN KEY ("endCustomerId") REFERENCES "Customer" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "DeliveryOrder_salesRepId_fkey" FOREIGN KEY ("salesRepId") REFERENCES "SalesRep" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "DeliveryOrder_builtById_fkey" FOREIGN KEY ("builtById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_DeliveryOrder" ("additionalCosts", "createdAt", "customerId", "customerName", "deliveryAddress", "endCustomerId", "endCustomerName", "id", "invoiceValue", "isActive", "notes", "orderNumber", "saleType", "status", "totalAmount", "updatedAt") SELECT "additionalCosts", "createdAt", "customerId", "customerName", "deliveryAddress", "endCustomerId", "endCustomerName", "id", "invoiceValue", "isActive", "notes", "orderNumber", "saleType", "status", "totalAmount", "updatedAt" FROM "DeliveryOrder";
DROP TABLE "DeliveryOrder";
ALTER TABLE "new_DeliveryOrder" RENAME TO "DeliveryOrder";
CREATE UNIQUE INDEX "DeliveryOrder_orderNumber_key" ON "DeliveryOrder"("orderNumber");
CREATE TABLE "new_DeliveryOrderItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "deliveryOrderId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unitPrice" REAL NOT NULL,
    "isBackorder" BOOLEAN NOT NULL DEFAULT false,
    "quantityFulfilled" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "backorderItemId" TEXT,
    "serviceStartDate" DATETIME,
    "serviceEndDate" DATETIME,
    "unitCost" REAL,
    CONSTRAINT "DeliveryOrderItem_deliveryOrderId_fkey" FOREIGN KEY ("deliveryOrderId") REFERENCES "DeliveryOrder" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "DeliveryOrderItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "DeliveryOrderItem_backorderItemId_fkey" FOREIGN KEY ("backorderItemId") REFERENCES "BackorderItem" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_DeliveryOrderItem" ("createdAt", "deliveryOrderId", "id", "isBackorder", "productId", "quantity", "unitPrice", "updatedAt") SELECT "createdAt", "deliveryOrderId", "id", "isBackorder", "productId", "quantity", "unitPrice", "updatedAt" FROM "DeliveryOrderItem";
DROP TABLE "DeliveryOrderItem";
ALTER TABLE "new_DeliveryOrderItem" RENAME TO "DeliveryOrderItem";
CREATE TABLE "new_GRNItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "grnId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "serialNumbers" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unitCost" REAL NOT NULL,
    "locationId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "GRNItem_grnId_fkey" FOREIGN KEY ("grnId") REFERENCES "GoodsReceiptNote" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "GRNItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_GRNItem" ("createdAt", "grnId", "id", "locationId", "productId", "quantity", "serialNumbers", "unitCost") SELECT "createdAt", "grnId", "id", "locationId", "productId", "quantity", "serialNumbers", "unitCost" FROM "GRNItem";
DROP TABLE "GRNItem";
ALTER TABLE "new_GRNItem" RENAME TO "GRNItem";
CREATE TABLE "new_Invoice" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "invoiceNumber" TEXT NOT NULL,
    "customerInvoiceRef" TEXT,
    "customerId" TEXT,
    "customerName" TEXT NOT NULL,
    "customerEmail" TEXT,
    "customerPhone" TEXT,
    "totalAmount" REAL NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL,
    "hasBackorders" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "salesRepId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Invoice_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Invoice_salesRepId_fkey" FOREIGN KEY ("salesRepId") REFERENCES "SalesRep" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Invoice" ("createdAt", "customerEmail", "customerId", "customerInvoiceRef", "customerName", "customerPhone", "hasBackorders", "id", "invoiceNumber", "notes", "status", "totalAmount", "updatedAt") SELECT "createdAt", "customerEmail", "customerId", "customerInvoiceRef", "customerName", "customerPhone", "hasBackorders", "id", "invoiceNumber", "notes", "status", "totalAmount", "updatedAt" FROM "Invoice";
DROP TABLE "Invoice";
ALTER TABLE "new_Invoice" RENAME TO "Invoice";
CREATE UNIQUE INDEX "Invoice_invoiceNumber_key" ON "Invoice"("invoiceNumber");
CREATE TABLE "new_User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "mustChangePassword" BOOLEAN NOT NULL DEFAULT false,
    "lastLoginAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "createdBy" TEXT,
    "roleId" TEXT,
    "role" TEXT,
    "salesRepId" TEXT,
    CONSTRAINT "User_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "User_salesRepId_fkey" FOREIGN KEY ("salesRepId") REFERENCES "SalesRep" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_User" ("createdAt", "createdBy", "email", "id", "isActive", "lastLoginAt", "mustChangePassword", "name", "password", "role", "updatedAt") SELECT "createdAt", "createdBy", "email", "id", "isActive", "lastLoginAt", "mustChangePassword", "name", "password", "role", "updatedAt" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

