# Professional CRM & Project Management System Design

## Overview
A high-end CRM and Project Management module where **"Every Sale is a Project"**.
This system manages the entire lifecycle of a client engagement, from lead generation to deal closure and delivery execution, without modifying core legacy tables.

## Core Philosophy: The Sales Project
Instead of simple "Deals", we introduce **Sales Projects**.
A Sales Project is a container for:
*   **The Opportunity**: Financials, probability, stages.
*   **The Team**: Internal stakeholders (Sales Reps, Engineers, PMs) working on the deal.
*   **The Plan**: Tasks, milestones, and deadlines required to win/deliver the sale.
*   **The History**: Comprehensive timeline of all interactions (calls, emails, meetings).
*   **The Collateral**: Quotations, files, and requirements documents.

## Enhanced Features

### 1. Project-Based Pipeline (Kanban 2.0)
*   **Multi-Pipeline Support**: Different workflows for different sales types (e.g., "Standard Sale" vs "Tender/RFP" vs "managed Services").
*   **Kanban Board**: Drag-and-drop projects between stages.
*   **Project Card**: Shows Title, Client, Value, Lead Owner, Next Deadline, and Task Progress bar.

### 2. Comprehensive Task Management
*   **Project Tasks**: specific to a Sales Project (e.g., "Prepare Technical Specs", "Legal Review").
*   **Assignment**: Assign tasks to specific users, not just the sales rep.
*   **Due Dates & Priorities**: Critical path tracking.
*   **Status**: Todo, In Progress, Blocked, Done.

### 3. Advanced Activity Logging
*   **Rich Interaction Log**: Log calls, meetings, emails with **rich text notes**.
*   **Outcome Tracking**: Did the meeting result in a next step?
*   **Pinning**: Pin important notes to the top of the project timeline.

### 4. Professional Quotation Engine
*   **Multiple Versions**: `v1`, `v2`, `Final` tracking.
*   **Approval Workflow**: Draft -> Internal Review -> Approved -> Sent to Client.
*   **PDF Generation**: Professional layout with "Bill To", "Ship To", Line Items, Taxes, and Terms.

### 5. Team Collaboration
*   **Project Team**: Explicitly add users to a project with roles (Owner, Member, Viewer).
*   **Watchers**: Users who get notified of updates without being active members.

---

## Database Schema (Prisma)

```prisma
// ------------------------------------------
// 1. Core Project & Pipeline
// ------------------------------------------

model CRMPipeline {
  id          String      @id @default(uuid())
  name        String      // e.g., "Standard Sales", "Enterprise RFP"
  isDefault   Boolean     @default(false)
  stages      CRMStage[]
  projects    CRMProject[]
}

model CRMStage {
  id          String      @id @default(uuid())
  name        String      // e.g., "Discovery", "Proposal", "Negotiation"
  order       Int
  color       String?
  pipelineId  String
  pipeline    CRMPipeline @relation(fields: [pipelineId], references: [id])
  projects    CRMProject[]
}

model CRMProject {
  id          String      @id @default(uuid())
  projectCode String      @unique // e.g., PRJ-2024-001
  title       String
  description String?
  
  // Financials
  status      String      // OPEN, WON, LOST, ON_HOLD
  probability Int         @default(0) // 0-100%
  expectedValue Float     @default(0)
  currency    String      @default("INR")
  
  // Dates
  startDate   DateTime    @default(now())
  targetDate  DateTime?   // Expected Close
  closedAt    DateTime?
  
  // Relations
  stageId     String
  stage       CRMStage    @relation(fields: [stageId], references: [id])
  
  pipelineId  String
  pipeline    CRMPipeline @relation(fields: [pipelineId], references: [id])
  
  // External Links (Read-Only)
  customerId  String
  customer    Customer    @relation(fields: [customerId], references: [id])
  
  // Project Components
  members     ProjectMember[]
  tasks       ProjectTask[]
  activities  CRMActivity[]
  quotes      CRMQuote[]
  
  createdAt   DateTime    @default(now())
  updatedAt   DateTime    @updatedAt
  isDeleted   Boolean     @default(false)
}

// ------------------------------------------
// 2. Team & Collaboration
// ------------------------------------------

model ProjectMember {
  id          String      @id @default(uuid())
  projectId   String
  project     CRMProject  @relation(fields: [projectId], references: [id], onDelete: Cascade)
  userId      String
  user        User        @relation(fields: [userId], references: [id])
  role        String      // OWNER, MEMBER, VIEWER
  
  joinedAt    DateTime    @default(now())
  @@unique([projectId, userId])
}

// ------------------------------------------
// 3. Task Management
// ------------------------------------------

model ProjectTask {
  id          String      @id @default(uuid())
  title       String
  description String?
  status      String      // TODO, IN_PROGRESS, REVIEW, DONE
  priority    String      // LOW, MEDIUM, HIGH, URGENT
  
  dueDate     DateTime?
  
  projectId   String
  project     CRMProject  @relation(fields: [projectId], references: [id], onDelete: Cascade)
  
  assignedToId String?
  assignedTo   User?      @relation("TaskAssignee", fields: [assignedToId], references: [id])
  
  createdById  String
  createdBy    User       @relation("TaskCreator", fields: [createdById], references: [id])
  
  createdAt   DateTime    @default(now())
  updatedAt   DateTime    @updatedAt
}

// ------------------------------------------
// 4. Activity Logs
// ------------------------------------------

model CRMActivity {
  id          String      @id @default(uuid())
  type        String      // CALL, MEETING, EMAIL, NOTE, SYSTEM
  subject     String
  content     String?     // Rich text or simple text
  outcome     String?     // e.g., "Needs Follow-up", "No Answer"
  
  projectId   String
  project     CRMProject  @relation(fields: [projectId], references: [id], onDelete: Cascade)
  
  createdById String
  createdBy   User        @relation(fields: [createdById], references: [id])
  
  createdAt   DateTime    @default(now())
}

// ------------------------------------------
// 5. Quotation Engine
// ------------------------------------------

model CRMQuote {
  id          String      @id @default(uuid())
  quoteNumber String      @unique // e.g., QT-2024-001
  version     Int         @default(1)
  status      String      // DRAFT, PENDING_APPROVAL, APPROVED, SENT, ACCEPTED, REJECTED
  
  validUntil  DateTime?
  terms       String?     // Specific terms for this quote
  
  subTotal    Float
  taxAmount   Float
  discount    Float       @default(0)
  totalAmount Float
  
  projectId   String
  project     CRMProject  @relation(fields: [projectId], references: [id])
  
  items       CRMQuoteItem[]
  
  templateId  String?     // Future: Linking to a print template?
  
  createdAt   DateTime    @default(now())
  updatedAt   DateTime    @updatedAt
}

model CRMQuoteItem {
  id          String      @id @default(uuid())
  quoteId     String
  quote       CRMQuote    @relation(fields: [quoteId], references: [id], onDelete: Cascade)
  
  order       Int         // Display order
  
  productId   String?     // Optional link to catalog
  product     Product?    @relation(fields: [productId], references: [id])
  
  description String      // Can be custom or overwritten product name
  quantity    Int
  unitPrice   Float
  discount    Float       @default(0)
  taxRate     Float       @default(0)
  total       Float
}
```

## Implementation Roadmap

### Phase 1: Core Framework (Schema & Pipeline)
*   **Goal**: Get the "Project" structure live.
*   **Actions**:
    *   Initialize Database Schema updates.
    *   Create "Standard Sales Pipeline" with stages (Lead, Qualified, Proposal, Negotiation, Closing, Won).
    *   Build the **Kanban Board** to visualize Projects.

### Phase 2: Project Detail View (The "Cockpit")
*   **Goal**: A single view to manage everything about a sale.
*   **UI Components**:
    *   **Header**: High-level stats (Value, Probability, Target Date).
    *   **Tabs**: Overview, Activity, Tasks, Team, Quotes.
    *   **Activity Feed**: The central timeline of events.

### Phase 3: Task & Team Management
*   **Goal**: Collaboration.
*   **Actions**:
    *   Implement Task CRUD with assignment.
    *   Implement "Add Member" logic.

### Phase 4: Quotation System
*   **Goal**: Generating professional documents.
*   **Actions**:
    *   Quote Builder UI (Add/Edit Line Items).
    *   PDF Print View generator.
