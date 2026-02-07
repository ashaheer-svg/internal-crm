/*
  Warnings:

  - Added the required column `productId` to the `InvoiceItem` table without a default value. This is not possible if the table is not empty.

*/
-- CreateTable
CREATE TABLE "BackorderItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "invoiceId" TEXT NOT NULL,
    "invoiceItemId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "quantityOrdered" INTEGER NOT NULL,
    "quantityFulfilled" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "BackorderItem_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "BackorderItem_invoiceItemId_fkey" FOREIGN KEY ("invoiceItemId") REFERENCES "InvoiceItem" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "BackorderItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Invoice" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "invoiceNumber" TEXT NOT NULL,
    "customerName" TEXT NOT NULL,
    "customerEmail" TEXT,
    "customerPhone" TEXT,
    "totalAmount" REAL NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL,
    "hasBackorders" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Invoice" ("createdAt", "customerEmail", "customerName", "customerPhone", "id", "invoiceNumber", "notes", "status", "totalAmount", "updatedAt") SELECT "createdAt", "customerEmail", "customerName", "customerPhone", "id", "invoiceNumber", "notes", "status", "totalAmount", "updatedAt" FROM "Invoice";
DROP TABLE "Invoice";
ALTER TABLE "new_Invoice" RENAME TO "Invoice";
CREATE UNIQUE INDEX "Invoice_invoiceNumber_key" ON "Invoice"("invoiceNumber");
CREATE TABLE "new_InvoiceItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "invoiceId" TEXT NOT NULL,
    "inventoryItemId" TEXT,
    "productId" TEXT NOT NULL,
    "productName" TEXT NOT NULL,
    "serialNumber" TEXT,
    "unitPrice" REAL NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "isFulfilled" BOOLEAN NOT NULL DEFAULT true,
    "fulfilledAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "InvoiceItem_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "InvoiceItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_InvoiceItem" ("createdAt", "id", "inventoryItemId", "invoiceId", "productName", "serialNumber", "unitPrice") SELECT "createdAt", "id", "inventoryItemId", "invoiceId", "productName", "serialNumber", "unitPrice" FROM "InvoiceItem";
DROP TABLE "InvoiceItem";
ALTER TABLE "new_InvoiceItem" RENAME TO "InvoiceItem";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "BackorderItem_invoiceItemId_key" ON "BackorderItem"("invoiceItemId");
