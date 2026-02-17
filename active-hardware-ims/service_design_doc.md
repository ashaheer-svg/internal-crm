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

## 6. Alternative Implementation (Non-Invasive Strategy)

This section outlines an implementation strategy that **avoids modifying existing database tables** (e.g., `Product`, `InventoryItem`), ensuring backward compatibility and minimizing migration risks. New tables are permitted, and writing to Log tables is allowed.

### 6.1 Data Model Extensions

Instead of adding fields to the `Product` table, we will use a **sidecar/extension table** pattern.

#### A. New Model: `ServiceDefinition`
This table stores service-specific metadata and links strictly 1:1 with a `Product`. If a product has a corresponding `ServiceDefinition`, it is considered a Service.

```prisma
// New Enum (Allowed)
enum ServiceType {
  ONE_TIME
  SUBSCRIPTION
  CONTRACT
  RENTAL
  LICENSE
}

enum DurationUnit {
  DAY
  WEEK
  MONTH
  YEAR
}

// New Table (Allowed)
model ServiceDefinition {
  id          String   @id @default(uuid())
  
  // Link to existing Product table (Read-Only access to Product)
  productId   String   @unique 
  product     Product  @relation(fields: [productId], references: [id])
  
  type        ServiceType
  
  // Service-specific fields
  durationValue   Int      @default(1) // e.g. 1
  durationUnit    DurationUnit @default(YEAR) // e.g. YEAR
  
  isMetered       Boolean      @default(false)
  
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}
```

#### B. New Model: `ServiceContract`
Same as the original design, but links to `Product` (and checks `ServiceDefinition` for logic).

```prisma
model ServiceContract {
  id              String   @id @default(uuid())
  // ... (Same fields as Section 1.B)
  
  // Relation to Product remains valid as we can read Product
  productId       String
  product         Product  @relation(fields: [productId], references: [id])

  // Renewal Linking (Chain of contracts)
  previousContractId String? @unique
  previousContract   ServiceContract? @relation("RenewalHistory", fields: [previousContractId], references: [id])
  nextContract       ServiceContract? @relation("RenewalHistory")

  // Explicit Duration for this specific contract instance
  durationValue   Int      @default(1)
  durationUnit    DurationUnit @default(YEAR)

  // Rental specific
  rentedAssetId   String?  @unique
  rentedAsset     RentalAsset? @relation("ActiveRental")

  // ... other fields
}
```

#### C. Handling Rentals (New: Separate Rental Inventory)
Since rental assets are distinct from sales inventory, we will create a dedicated `RentalAsset` table.

```prisma
enum RentalStatus {
  AVAILABLE
  RENTED
  MAINTENANCE
  RETIRED
}

model RentalAsset {
  id              String   @id @default(uuid())
  
  name            String   // e.g. "Macbook Pro 16 - Asset #001"
  serialNumber    String   @unique
  
  // Optional link to Product purely for description/specs reference
  productId       String?
  product         Product? @relation(fields: [productId], references: [id])
  
  status          RentalStatus @default(AVAILABLE)
  
  // Current Active Rental Link
  currentContractId String? @unique
  currentContract   ServiceContract? @relation("ActiveRental", fields: [currentContractId], references: [id])
  
  notes           String?
  
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
}
```
*Logic*: 
-   **Rent Out**: Assign `RentalAsset` to `ServiceContract`. Set `RentalAsset.status = RENTED`.
-   **Return**: Clear `currentContractId` from `RentalAsset`. Set `status = AVAILABLE` (or `MAINTENANCE`).

### 6.2 Logic & Workflow Adjustments

#### A. Product Identification
-   **Is it a Service?**: Check if `db.serviceDefinition.findUnique({ where: { productId } })` returns a record.
-   **Catalog UI**: Merge `Product` data with `ServiceDefinition` data when displaying.

#### B. Logging
-   All service lifecycle events (Provisioning, Renewal, Cancellation) should be logged.
-   **Allowed**: Writing to existing `AuditLog` or `TransactionLog` tables.
-   *Example*: When a service is activated, insert a record into `TransactionLog` with `type: 'SERVICE_ACTIVATION'`.

#### C. Inventory Constraints
-   Since we cannot add `RENTED` to the `status` enum in `InventoryItem`:
### 6.3 Service Tracking & Expiration Logic

#### A. Calculating Expiration
-   **`endDate` Calculation**: When a contract is created (or activated), `endDate` is automatically calculated based on `startDate` + (`durationValue` * `durationUnit`).
-   *Example*: 1 Year starting Jan 1, 2024 -> End Date: Jan 1, 2025.
-   *Example*: 2 Weeks starting Feb 1, 2024 -> End Date: Feb 15, 2024.

#### B. Expiration Alerts
-   **Query**: A scheduled job or dashboard query filters `ServiceContract` where:
    -   `status` is `ACTIVE`
    -   `endDate` is <= (`Today` + `AlertThreshold` (e.g., 30 days))
-   **Dashboard Widget**: "Upcoming Renewals" list sorted by `endDate` ASC.
-   **Email Notification**: Optional automated email to Sales Rep or Customer when within threshold.

#### C. Renewal Workflow
-   **Action**: User clicks "Renew" on an expiring contract.
-   **Result**:
    1.  New `ServiceContract` created.
    2.  `previousContractId` set to the old contract's ID.
    3.  `startDate` set to old contract's `endDate` + 1 day (or continuous).
    4.  Old contract remains `ACTIVE` until it expires, then moves to `COMPLETED` or `EXPIRED`.
    5.  New contract starts as `PENDING` until specific start date or payment.
