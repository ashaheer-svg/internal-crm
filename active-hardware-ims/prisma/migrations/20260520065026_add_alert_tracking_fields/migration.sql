/*
  Warnings:

  - You are about to drop the column `salesRep` on the `Customer` table. All the data in the column will be lost.

*/
-- CreateTable
CREATE TABLE "Role" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isSystemDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Permission" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "action" TEXT NOT NULL,
    "resource" TEXT NOT NULL,
    "description" TEXT
);

-- CreateTable
CREATE TABLE "RolePermission" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "roleId" TEXT NOT NULL,
    "permissionId" TEXT NOT NULL,
    "assignedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RolePermission_permissionId_fkey" FOREIGN KEY ("permissionId") REFERENCES "Permission" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "RolePermission_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SalesRep" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "SupplierRMA" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "rmaNumber" TEXT NOT NULL,
    "defectiveItemId" TEXT,
    "supplierId" TEXT NOT NULL,
    "supplierRmaRef" TEXT,
    "shippedAt" DATETIME,
    "notes" TEXT,
    "outcome" TEXT,
    "outcomeNotes" TEXT,
    "resolvedAt" DATETIME,
    "receivedItemId" TEXT,
    "creditNoteRef" TEXT,
    "creditNoteValue" REAL,
    "status" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "SupplierRMA_receivedItemId_fkey" FOREIGN KEY ("receivedItemId") REFERENCES "InventoryItem" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "SupplierRMA_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Customer" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "SupplierRMA_defectiveItemId_fkey" FOREIGN KEY ("defectiveItemId") REFERENCES "InventoryItem" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "DeliveryOrderItemDetail" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "deliveryOrderItemId" TEXT NOT NULL,
    "modelName" TEXT NOT NULL,
    "serialNumbers" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "DeliveryOrderItemDetail_deliveryOrderItemId_fkey" FOREIGN KEY ("deliveryOrderItemId") REFERENCES "DeliveryOrderItem" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ServiceDefinition" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "productId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "durationValue" INTEGER NOT NULL DEFAULT 1,
    "durationUnit" TEXT NOT NULL DEFAULT 'YEAR',
    "isMetered" BOOLEAN NOT NULL DEFAULT false,
    "billingCycle" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ServiceDefinition_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ServiceContract" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "customerId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "invoiceItemId" TEXT,
    "startDate" DATETIME,
    "endDate" DATETIME,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "previousContractId" TEXT,
    "durationValue" INTEGER NOT NULL DEFAULT 1,
    "durationUnit" TEXT NOT NULL DEFAULT 'YEAR',
    "licenseKey" TEXT,
    "description" TEXT,
    "contractNumber" TEXT,
    "contractValue" REAL NOT NULL DEFAULT 0,
    "unitCost" REAL NOT NULL DEFAULT 0,
    "invoiceReference" TEXT,
    "partnerId" TEXT,
    "salesRepId" TEXT,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "coveredSerials" TEXT,
    "productModel" TEXT,
    CONSTRAINT "ServiceContract_salesRepId_fkey" FOREIGN KEY ("salesRepId") REFERENCES "SalesRep" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "ServiceContract_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "Customer" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "ServiceContract_previousContractId_fkey" FOREIGN KEY ("previousContractId") REFERENCES "ServiceContract" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "ServiceContract_invoiceItemId_fkey" FOREIGN KEY ("invoiceItemId") REFERENCES "InvoiceItem" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "ServiceContract_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ServiceContract_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ServiceContractItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "serviceContractId" TEXT NOT NULL,
    "modelName" TEXT NOT NULL,
    "serialNumbers" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ServiceContractItem_serviceContractId_fkey" FOREIGN KEY ("serviceContractId") REFERENCES "ServiceContract" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "RentalAsset" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "serialNumber" TEXT NOT NULL,
    "productId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'AVAILABLE',
    "currentContractId" TEXT,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "RentalAsset_currentContractId_fkey" FOREIGN KEY ("currentContractId") REFERENCES "ServiceContract" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "RentalAsset_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CRMPipeline" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false
);

-- CreateTable
CREATE TABLE "CRMStage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "color" TEXT,
    "pipelineId" TEXT NOT NULL,
    CONSTRAINT "CRMStage_pipelineId_fkey" FOREIGN KEY ("pipelineId") REFERENCES "CRMPipeline" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CRMProject" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectCode" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL,
    "probability" INTEGER NOT NULL DEFAULT 0,
    "expectedValue" REAL NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "startDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "targetDate" DATETIME,
    "closedAt" DATETIME,
    "stageId" TEXT NOT NULL,
    "pipelineId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "partnerId" TEXT,
    "salesRepId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "expectedCloseDate" DATETIME,
    "brand" TEXT,
    CONSTRAINT "CRMProject_salesRepId_fkey" FOREIGN KEY ("salesRepId") REFERENCES "SalesRep" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "CRMProject_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "Customer" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "CRMProject_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "CRMProject_pipelineId_fkey" FOREIGN KEY ("pipelineId") REFERENCES "CRMPipeline" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "CRMProject_stageId_fkey" FOREIGN KEY ("stageId") REFERENCES "CRMStage" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ProjectMember" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "joinedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ProjectMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ProjectMember_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "CRMProject" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ProjectTask" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL,
    "priority" TEXT NOT NULL,
    "dueDate" DATETIME,
    "projectId" TEXT NOT NULL,
    "assignedToId" TEXT,
    "assignedToRoleId" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "attachmentUrl" TEXT,
    CONSTRAINT "ProjectTask_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ProjectTask_assignedToRoleId_fkey" FOREIGN KEY ("assignedToRoleId") REFERENCES "Role" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "ProjectTask_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "ProjectTask_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "CRMProject" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CRMActivity" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "type" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "content" TEXT,
    "outcome" TEXT,
    "projectId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CRMActivity_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "CRMActivity_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "CRMProject" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CRMQuote" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "quoteNumber" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "status" TEXT NOT NULL,
    "validUntil" DATETIME,
    "terms" TEXT,
    "subTotal" REAL NOT NULL,
    "taxAmount" REAL NOT NULL,
    "taxDetails" TEXT,
    "discount" REAL NOT NULL DEFAULT 0,
    "totalAmount" REAL NOT NULL,
    "projectId" TEXT NOT NULL,
    "templateId" TEXT,
    "poNumber" TEXT,
    "poDocumentUrl" TEXT,
    "expectedDeliveryDate" DATETIME,
    "urgency" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "createdById" TEXT NOT NULL,
    "deliveryOrderId" TEXT,
    "saleType" TEXT NOT NULL DEFAULT 'DIRECT',
    "billToId" TEXT,
    "shipToId" TEXT,
    CONSTRAINT "CRMQuote_shipToId_fkey" FOREIGN KEY ("shipToId") REFERENCES "Customer" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "CRMQuote_billToId_fkey" FOREIGN KEY ("billToId") REFERENCES "Customer" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "CRMQuote_deliveryOrderId_fkey" FOREIGN KEY ("deliveryOrderId") REFERENCES "DeliveryOrder" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "CRMQuote_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "CRMQuote_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "CRMProject" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CRMQuoteItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "quoteId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "productId" TEXT,
    "description" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unitPrice" REAL NOT NULL,
    "discount" REAL NOT NULL DEFAULT 0,
    "taxRate" REAL NOT NULL DEFAULT 0,
    "total" REAL NOT NULL,
    "productModel" TEXT,
    "serialNumbers" TEXT,
    CONSTRAINT "CRMQuoteItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "CRMQuoteItem_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "CRMQuote" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CRMQuoteItemDetail" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "quoteItemId" TEXT NOT NULL,
    "modelName" TEXT NOT NULL,
    "serialNumbers" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "CRMQuoteItemDetail_quoteItemId_fkey" FOREIGN KEY ("quoteItemId") REFERENCES "CRMQuoteItem" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TaxConfiguration" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "rate" REAL NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'PERCENTAGE',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "SystemSetting" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Message" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "subject" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'GENERAL',
    "priority" TEXT NOT NULL DEFAULT 'MEDIUM',
    "deadline" DATETIME,
    "isSystemGenerated" BOOLEAN NOT NULL DEFAULT false,
    "senderId" TEXT,
    "recipientUserId" TEXT,
    "recipientRoleId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "customerName" TEXT,
    "deliveryOrderNumber" TEXT,
    "invoiceNumber" TEXT,
    "partnerName" TEXT,
    CONSTRAINT "Message_recipientRoleId_fkey" FOREIGN KEY ("recipientRoleId") REFERENCES "Role" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Message_recipientUserId_fkey" FOREIGN KEY ("recipientUserId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Message_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "MessageAttachment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "messageId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "filePath" TEXT NOT NULL,
    "fileType" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MessageAttachment_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "Message" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "MessageReceipt" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "messageId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "viewedAt" DATETIME,
    "isDone" BOOLEAN NOT NULL DEFAULT false,
    "doneAt" DATETIME,
    "comment" TEXT,
    CONSTRAINT "MessageReceipt_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "MessageReceipt_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "Message" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PendingProjectImport" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "date" TEXT NOT NULL,
    "customerName" TEXT NOT NULL,
    "partnerName" TEXT,
    "brand" TEXT,
    "salesRepName" TEXT,
    "value" REAL NOT NULL,
    "stage" TEXT NOT NULL,
    "pipelineId" TEXT NOT NULL,
    "uploadedById" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "projectTitle" TEXT,
    CONSTRAINT "PendingProjectImport_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "NasModel" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "modelName" TEXT NOT NULL,
    "bays" INTEGER NOT NULL,
    "expansionUnitModel" TEXT,
    "expansionBaysPerUnit" INTEGER NOT NULL DEFAULT 0,
    "maxExpansionUnitsSupported" INTEGER NOT NULL DEFAULT 0,
    "defaultRamGB" REAL NOT NULL DEFAULT 0,
    "maxRamGB" REAL NOT NULL DEFAULT 0,
    "supportsSATA" BOOLEAN NOT NULL DEFAULT true,
    "supportsSAS" BOOLEAN NOT NULL DEFAULT false,
    "formFactor" TEXT NOT NULL,
    "powerType" TEXT NOT NULL,
    "networkPorts" TEXT,
    "series" TEXT,
    "targetMarket" TEXT,
    "productId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "NasCompatibility" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nasModelId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "NasCompatibility_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "NasCompatibility_nasModelId_fkey" FOREIGN KEY ("nasModelId") REFERENCES "NasModel" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "BuildRejection" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "deliveryOrderId" TEXT NOT NULL,
    "inventoryItemId" TEXT NOT NULL,
    "serialNumber" TEXT NOT NULL,
    "comment" TEXT,
    "rejectedById" TEXT NOT NULL,
    "rejectedByName" TEXT NOT NULL,
    "rejectedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dismissed" BOOLEAN NOT NULL DEFAULT false,
    "dismissedAt" DATETIME,
    "dismissedByName" TEXT,
    CONSTRAINT "BuildRejection_deliveryOrderId_fkey" FOREIGN KEY ("deliveryOrderId") REFERENCES "DeliveryOrder" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_AuditLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT,
    "userId" TEXT,
    "userName" TEXT NOT NULL,
    "changes" TEXT,
    "metadata" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_AuditLog" ("action", "changes", "createdAt", "entityId", "entityType", "id", "metadata", "userId", "userName") SELECT "action", "changes", "createdAt", "entityId", "entityType", "id", "metadata", "userId", "userName" FROM "AuditLog";
DROP TABLE "AuditLog";
ALTER TABLE "new_AuditLog" RENAME TO "AuditLog";
CREATE INDEX "AuditLog_entityType_entityId_idx" ON "AuditLog"("entityType", "entityId");
CREATE INDEX "AuditLog_userId_idx" ON "AuditLog"("userId");
CREATE INDEX "AuditLog_action_idx" ON "AuditLog"("action");
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");
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
    "buildInstructions" TEXT,
    "deliveryInstructions" TEXT,
    "additionalContact" TEXT,
    "deliveryCharges" REAL NOT NULL DEFAULT 0,
    CONSTRAINT "DeliveryOrder_builtById_fkey" FOREIGN KEY ("builtById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "DeliveryOrder_salesRepId_fkey" FOREIGN KEY ("salesRepId") REFERENCES "SalesRep" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "DeliveryOrder_endCustomerId_fkey" FOREIGN KEY ("endCustomerId") REFERENCES "Customer" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "DeliveryOrder_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer" ("id") ON DELETE SET NULL ON UPDATE CASCADE
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
    "serviceEndDate" DATETIME,
    "serviceStartDate" DATETIME,
    "unitCost" REAL,
    "licenseKey" TEXT,
    "expiryAlertSentAt" DATETIME,
    "expiredAlertSentAt" DATETIME,
    CONSTRAINT "DeliveryOrderItem_backorderItemId_fkey" FOREIGN KEY ("backorderItemId") REFERENCES "BackorderItem" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "DeliveryOrderItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "DeliveryOrderItem_deliveryOrderId_fkey" FOREIGN KEY ("deliveryOrderId") REFERENCES "DeliveryOrder" ("id") ON DELETE CASCADE ON UPDATE CASCADE
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
    CONSTRAINT "GRNItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "GRNItem_grnId_fkey" FOREIGN KEY ("grnId") REFERENCES "GoodsReceiptNote" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_GRNItem" ("createdAt", "grnId", "id", "locationId", "productId", "quantity", "serialNumbers", "unitCost") SELECT "createdAt", "grnId", "id", "locationId", "productId", "quantity", "serialNumbers", "unitCost" FROM "GRNItem";
DROP TABLE "GRNItem";
ALTER TABLE "new_GRNItem" RENAME TO "GRNItem";
CREATE TABLE "new_InventoryItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "serialNumber" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "unitCost" REAL NOT NULL DEFAULT 0,
    "warrantyExpiry" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "deliveryOrderItemId" TEXT,
    "warrantyClaimId" TEXT,
    CONSTRAINT "InventoryItem_warrantyClaimId_fkey" FOREIGN KEY ("warrantyClaimId") REFERENCES "WarrantyClaim" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "InventoryItem_deliveryOrderItemId_fkey" FOREIGN KEY ("deliveryOrderItemId") REFERENCES "DeliveryOrderItem" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "InventoryItem_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "InventoryItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_InventoryItem" ("createdAt", "deliveryOrderItemId", "id", "locationId", "productId", "serialNumber", "status", "unitCost", "updatedAt", "warrantyExpiry") SELECT "createdAt", "deliveryOrderItemId", "id", "locationId", "productId", "serialNumber", "status", "unitCost", "updatedAt", "warrantyExpiry" FROM "InventoryItem";
DROP TABLE "InventoryItem";
ALTER TABLE "new_InventoryItem" RENAME TO "InventoryItem";
CREATE UNIQUE INDEX "InventoryItem_serialNumber_key" ON "InventoryItem"("serialNumber");
CREATE INDEX "InventoryItem_productId_status_idx" ON "InventoryItem"("productId", "status");
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
    CONSTRAINT "Invoice_salesRepId_fkey" FOREIGN KEY ("salesRepId") REFERENCES "SalesRep" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Invoice_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Invoice" ("createdAt", "customerEmail", "customerId", "customerInvoiceRef", "customerName", "customerPhone", "hasBackorders", "id", "invoiceNumber", "notes", "status", "totalAmount", "updatedAt") SELECT "createdAt", "customerEmail", "customerId", "customerInvoiceRef", "customerName", "customerPhone", "hasBackorders", "id", "invoiceNumber", "notes", "status", "totalAmount", "updatedAt" FROM "Invoice";
DROP TABLE "Invoice";
ALTER TABLE "new_Invoice" RENAME TO "Invoice";
CREATE UNIQUE INDEX "Invoice_invoiceNumber_key" ON "Invoice"("invoiceNumber");
CREATE TABLE "new_Product" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sku" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "brand" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'General',
    "model" TEXT NOT NULL,
    "minStock" INTEGER NOT NULL DEFAULT 0,
    "warrantyMonths" INTEGER NOT NULL DEFAULT 0,
    "lowResellerPrice" REAL NOT NULL DEFAULT 0,
    "resellerPrice" REAL NOT NULL DEFAULT 0,
    "accessCount" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Product" ("brand", "category", "createdAt", "description", "id", "isActive", "lowResellerPrice", "minStock", "model", "name", "resellerPrice", "sku", "updatedAt", "warrantyMonths") SELECT "brand", "category", "createdAt", "description", "id", "isActive", "lowResellerPrice", "minStock", "model", "name", "resellerPrice", "sku", "updatedAt", "warrantyMonths" FROM "Product";
DROP TABLE "Product";
ALTER TABLE "new_Product" RENAME TO "Product";
CREATE UNIQUE INDEX "Product_sku_key" ON "Product"("sku");
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
    CONSTRAINT "User_salesRepId_fkey" FOREIGN KEY ("salesRepId") REFERENCES "SalesRep" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "User_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_User" ("createdAt", "createdBy", "email", "id", "isActive", "lastLoginAt", "mustChangePassword", "name", "password", "role", "updatedAt") SELECT "createdAt", "createdBy", "email", "id", "isActive", "lastLoginAt", "mustChangePassword", "name", "password", "role", "updatedAt" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE TABLE "new_WarrantyClaim" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "inventoryItemId" TEXT NOT NULL,
    "customerId" TEXT,
    "customerName" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "replacementType" TEXT,
    "replacementItemId" TEXT,
    "replacementProvidedAt" DATETIME,
    "replacementReturnedAt" DATETIME,
    "replacementExternalInfo" TEXT,
    "supplierRmaId" TEXT,
    "resolution" TEXT,
    "resolvedAt" DATETIME,
    "resolvedById" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "WarrantyClaim_resolvedById_fkey" FOREIGN KEY ("resolvedById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "WarrantyClaim_supplierRmaId_fkey" FOREIGN KEY ("supplierRmaId") REFERENCES "SupplierRMA" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "WarrantyClaim_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "WarrantyClaim_inventoryItemId_fkey" FOREIGN KEY ("inventoryItemId") REFERENCES "InventoryItem" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_WarrantyClaim" ("createdAt", "customerName", "description", "id", "inventoryItemId", "status", "updatedAt") SELECT "createdAt", "customerName", "description", "id", "inventoryItemId", "status", "updatedAt" FROM "WarrantyClaim";
DROP TABLE "WarrantyClaim";
ALTER TABLE "new_WarrantyClaim" RENAME TO "WarrantyClaim";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "Role_name_key" ON "Role"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Permission_action_resource_key" ON "Permission"("action", "resource");

-- CreateIndex
CREATE UNIQUE INDEX "RolePermission_roleId_permissionId_key" ON "RolePermission"("roleId", "permissionId");

-- CreateIndex
CREATE UNIQUE INDEX "SupplierRMA_rmaNumber_key" ON "SupplierRMA"("rmaNumber");

-- CreateIndex
CREATE UNIQUE INDEX "SupplierRMA_receivedItemId_key" ON "SupplierRMA"("receivedItemId");

-- CreateIndex
CREATE UNIQUE INDEX "ServiceDefinition_productId_key" ON "ServiceDefinition"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "ServiceContract_invoiceItemId_key" ON "ServiceContract"("invoiceItemId");

-- CreateIndex
CREATE UNIQUE INDEX "ServiceContract_previousContractId_key" ON "ServiceContract"("previousContractId");

-- CreateIndex
CREATE UNIQUE INDEX "ServiceContract_contractNumber_key" ON "ServiceContract"("contractNumber");

-- CreateIndex
CREATE INDEX "ServiceContractItem_serviceContractId_idx" ON "ServiceContractItem"("serviceContractId");

-- CreateIndex
CREATE UNIQUE INDEX "RentalAsset_serialNumber_key" ON "RentalAsset"("serialNumber");

-- CreateIndex
CREATE UNIQUE INDEX "CRMProject_projectCode_key" ON "CRMProject"("projectCode");

-- CreateIndex
CREATE UNIQUE INDEX "ProjectMember_projectId_userId_key" ON "ProjectMember"("projectId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "CRMQuote_quoteNumber_key" ON "CRMQuote"("quoteNumber");

-- CreateIndex
CREATE INDEX "CRMQuoteItemDetail_quoteItemId_idx" ON "CRMQuoteItemDetail"("quoteItemId");

-- CreateIndex
CREATE UNIQUE INDEX "SystemSetting_key_key" ON "SystemSetting"("key");

-- CreateIndex
CREATE INDEX "Message_senderId_idx" ON "Message"("senderId");

-- CreateIndex
CREATE INDEX "Message_recipientUserId_idx" ON "Message"("recipientUserId");

-- CreateIndex
CREATE INDEX "Message_recipientRoleId_idx" ON "Message"("recipientRoleId");

-- CreateIndex
CREATE INDEX "MessageAttachment_messageId_idx" ON "MessageAttachment"("messageId");

-- CreateIndex
CREATE INDEX "MessageReceipt_messageId_idx" ON "MessageReceipt"("messageId");

-- CreateIndex
CREATE INDEX "MessageReceipt_userId_idx" ON "MessageReceipt"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "MessageReceipt_messageId_userId_key" ON "MessageReceipt"("messageId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "NasModel_modelName_key" ON "NasModel"("modelName");

-- CreateIndex
CREATE UNIQUE INDEX "NasCompatibility_nasModelId_productId_key" ON "NasCompatibility"("nasModelId", "productId");

-- CreateIndex
CREATE INDEX "BuildRejection_deliveryOrderId_idx" ON "BuildRejection"("deliveryOrderId");

-- CreateIndex
CREATE INDEX "BuildRejection_inventoryItemId_idx" ON "BuildRejection"("inventoryItemId");

-- CreateIndex
CREATE INDEX "BuildRejection_serialNumber_idx" ON "BuildRejection"("serialNumber");

-- CreateIndex
CREATE INDEX "PurchaseOrderItem_productId_createdAt_idx" ON "PurchaseOrderItem"("productId", "createdAt");
