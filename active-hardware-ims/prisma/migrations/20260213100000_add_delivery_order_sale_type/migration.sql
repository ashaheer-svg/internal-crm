-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
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
    "additionalCosts" REAL NOT NULL DEFAULT 0,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT "DeliveryOrder_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "DeliveryOrder_endCustomerId_fkey" FOREIGN KEY ("endCustomerId") REFERENCES "Customer" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_DeliveryOrder" ("additionalCosts", "createdAt", "customerId", "customerName", "deliveryAddress", "id", "invoiceValue", "isActive", "notes", "orderNumber", "status", "totalAmount", "updatedAt") SELECT "additionalCosts", "createdAt", "customerId", "customerName", "deliveryAddress", "id", "invoiceValue", "isActive", "notes", "orderNumber", "status", "totalAmount", "updatedAt" FROM "DeliveryOrder";
DROP TABLE "DeliveryOrder";
ALTER TABLE "new_DeliveryOrder" RENAME TO "DeliveryOrder";
CREATE UNIQUE INDEX "DeliveryOrder_orderNumber_key" ON "DeliveryOrder"("orderNumber");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
