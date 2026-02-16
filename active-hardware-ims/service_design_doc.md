# Service Products Implementation Design

This document outlines the structural design for adding "Service Products" to the system. This module will handle non-physical items like Licenses, AMCs, Rentals, and Labor.

## 1. Data Model Changes

### A. Update `Product` Model
We need to distinguish between Physical Goods and Services.

```prisma
enum ProductType {
  PHYSICAL
  SERVICE
}

enum ServiceType {
  ONE_TIME          // Labor, Installation
  SUBSCRIPTION      // Hosting, SaaS
  CONTRACT          // AMC, Warranty Extension
  RENTAL            // Equipment Rental
  LICENSE           // Software License
}

model Product {
  // ... existing fields
  type            ProductType @default(PHYSICAL)
  serviceType     ServiceType? // Nullable, only for SERVICE
  
  // Specific fields for services
  billingCycle    String?      // MONTHLY, YEARLY, ONE_TIME
  isMetered       Boolean      @default(false)
}
```

### B. New Model: `ServiceContract` (or `ServiceInstance`)
This tracks the *sold* instance of a service (e.g., John's Hosting Plan, Jane's AMC).

```prisma
enum ContractStatus {
  PENDING
  ACTIVE
  EXPIRED
  CANCELLED
  COMPLETED
}

model ServiceContract {
  id              String   @id @default(uuid())
  
  // Links
  customerId      String
  customer        Customer @relation(fields: [customerId], references: [id])
  productId       String
  product         Product  @relation(fields: [productId], references: [id])
  
  // Traceability
  invoiceItemId   String?  @unique // Link to the sales transaction
  invoiceItem     InvoiceItem? @relation(fields: [invoiceItemId], references: [id])
  
  // Contract Details
  startDate       DateTime?
  endDate         DateTime?
  status          ContractStatus @default(PENDING)
  
  // Specific Handling
  licenseKey      String?  // For Software Licenses
  
  // For AMCs / Warranty Extensions / Rentals
  linkedInventoryItemId String? 
  linkedInventoryItem   InventoryItem? @relation(fields: [linkedInventoryItemId], references: [id])
  
  description     String?  // Scope of work for Labor/AMC
  
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
}
```

### C. Update `InventoryItem` (For Rentals)
We need a new status for items that are currently out on rent.

```diff
// In schema.prisma InventoryItem status
- // AVAILABLE, RESERVED, DEFECTIVE, SOLD, RMA, WARRANTY_REPLACED, LOANED
+ // ..., RENTED
```

## 2. Module Structure & Features

### A. Product Catalog Integration
- **New Section/Filter**: "Services" tab in Product list.
- **Create/Edit**: When creating a product, select "Service".
    - If "Service", hide `minStock`, `weight`, etc.
    - Show `ServiceType` dropdown.

### B. Sales / Invoicing Flow
- **Adding Items**: When adding a Service Product to an invoice/order:
    - If **Labor/One-Time**: Just quantity and price.
    - If **Subscription/Contract**: Prompt for `StartDate` and `Duration` (or `EndDate`).
    - If **Rental**: Prompt for `StartDate`, `EndDate`, and *optionally* assign the specific `InventoryItem` being rented (if tracked).
    - If **Warranty Extension/AMC**: Prompt to select the `InventoryItem` this coverage applies to (e.g., coverage for Serial #123).

### C. Service Management Dashboard (New)
A new top-level section `Services` with subsections:
1.  **Active Contracts**: List of all running services (Hosting, AMCs).
    -   *Alerts*: Show contracts expiring in < 30 days.
2.  **Rentals**: Calendar view or list of items currently `RENTED`.
    -   *Action*: "Return" button to check inventory back in.
3.  **Licenses**: Repository of sold licenses.

## 3. Specific Handling by Service Type

| Service Type | Key Data | Workflow Points |
| :--- | :--- | :--- |
| **Software License** | `licenseKey` | Auto-generate or manually input key upon Invoice confirmation. Email to user. |
| **AMC / Warranty Ext** | `linkedInventoryItemId` | "Coverage" logic. When looking up an Inventory Item, show active AMC/Warranty contracts linked to it. |
| **Rentals** | `linkedInventoryItemId`, `dates` | **Check-Out**: Move stock to `RENTED`. **Check-In**: Move stock back to `AVAILABLE`. Need conflict checking for dates. |
| **Hosting** | `dates`, `renewal` | Automated reminders for renewal invoices. |
| **Labor** | `description` | Simple tracking. Status `COMPLETED` when work is done. |

## 4. Implications on Existing System

1.  **Inventory Counts**: Service Products do **not** count towards stock value or quantity. They should be excluded from "Low Stock" reports.
2.  **Revenue Reports**: Need to separate "Product Sales" from "Service Revenue" for better analytics.
3.  **Invoice Generation**:
    -   Service items might need different text on PDF (e.g., "Service Period: Jan 1 - Dec 31").
4.  **Delivery Orders**:
    -   Services are usually "fulfilled" instantly or via email, not via a Delivery Order (DO).
    -   **Exception**: Rentals. Rentals DO require a Delivery Order to ship the equipment.

## 5. Implementation Roadmap

1.  **Database Migration**: Add `ProductType`, `ServiceContract` model.
2.  **Product UI**: Update Product Form to handle Service types.
3.  **Order Entry**: Update Invoice/Quote forms to capture Service details (dates, linked items).
4.  **Fulfillment Logic**:
    -   Auto-create `ServiceContract` records when an Invoice is PAID/CONFIRMED.
5.  **Service Dashboard**: Build the view to manage active contracts.
