# Fix: Messaging ↔ CRM Task Sync & Owner Notification

## Background

The CRM has two separate but related task concepts:

| Concept | Location | Data Model |
|---|---|---|
| **ProjectTask** | `CRM → Projects → Tasks tab` | `ProjectTask` (status: `TODO`/`DONE`) |
| **MessageReceipt** | `Messaging → Inbox` | `MessageReceipt` (isDone: true/false) |

When a CRM task is created and assigned, the system correctly creates a `Message` (category: `TASK`) and `MessageReceipt` rows for the assignee(s). **However the reverse path is completely missing:** when the assignee completes that message-task in the inbox (writes a comment → clicks "Complete Task"), nothing talks back to the originating `ProjectTask`, and nothing notifies the project owner.

---

## Root Cause Analysis

### Flow 1: Completing a task in the inbox has NO effect on the CRM ProjectTask

**What happens today:**
```
User types comment + clicks "Complete Task"
  → handleMarkDone() in messaging/page.tsx
  → PATCH /api/messaging/[id]/receipt  { action: 'done', comment }
  → MessageReceipt.isDone = true  ✅
  → ProjectTask.status stays 'TODO'  ❌
```

`/api/messaging/[id]/receipt/route.ts` only updates `MessageReceipt`. It has **zero** knowledge of which `ProjectTask` the message came from, and it never updates it.

**Why the CRM view doesn't reflect it:**  
`CRMTaskSection.tsx` reads `ProjectTask.status`. Since that record was never touched, the task still shows as `TODO` on the project page. The project owner sees nothing changed.

### Flow 2: No notification is sent to the project owner/creator

**What happens today:**  
When `action: 'done'` is processed, the receipt API only sets `isDone = true` and writes an audit log. It does **not** create any new `Message` row to inform the task creator/project owner that the work is done.

### Flow 3: The `Message` created for a CRM task has no back-reference to the `ProjectTask`

The `Message` schema has no `projectTaskId` field. So the receipt API cannot look up which `ProjectTask` to update even if it tried.

---

## User Review Required

> [!IMPORTANT]
> The fix requires a **database schema migration** — adding a nullable `projectTaskId` field to the `Message` model. This is a backwards-compatible, additive change (no existing data is broken), but the database file must be updated via Prisma migrate.

> [!WARNING]
> The `/apply-updates` workflow must be used to safely apply the schema migration in production. Please approve the plan before we proceed, and be ready to run the migration.

---

## Open Questions

> [!IMPORTANT]
> **Who should receive the "task completed" notification?**
> 1. Only the task creator (`createdById` on `ProjectTask`)?
> 2. The task creator **plus** any project members with the `OWNER` role?
> 3. A specific user (e.g. Sales Rep linked to the project)?
>
> **Default assumption:** Notify the `createdById` user (whoever created the task in the CRM). Please confirm or specify additional recipients.

---

## Proposed Changes

### 1 — Database Schema

#### [MODIFY] [schema.prisma](file:///var/www/html/internal-crm/active-hardware-ims/prisma/schema.prisma)

Add a nullable `projectTaskId` field to the `Message` model so the receipt API can trace a message back to its originating CRM task.

```diff
 model Message {
   id                  String              @id @default(uuid())
   ...
+  projectTaskId       String?
+  projectTask         ProjectTask?        @relation(fields: [projectTaskId], references: [id], onDelete: SetNull)
   ...
 }

 model ProjectTask {
   ...
+  messages            Message[]
 }
```

---

### 2 — CRM Task Creation API

#### [MODIFY] [route.ts — /api/crm/tasks](file:///var/www/html/internal-crm/active-hardware-ims/app/api/crm/tasks/route.ts)

When a notification message is created for an assigned user/role, also store `projectTaskId` in that message so the receipt route can find it later.

**Change:** Add `projectTaskId: task.id` to both the per-user and per-role `message.create` calls (lines 40–79).

---

### 3 — Receipt PATCH API (core fix)

#### [MODIFY] [route.ts — /api/messaging/[id]/receipt](file:///var/www/html/internal-crm/active-hardware-ims/app/api/messaging/%5Bid%5D/receipt/route.ts)

When `action === 'done'`:
1. After updating `MessageReceipt.isDone`, look up the message's `projectTaskId`.
2. If it exists, update `ProjectTask.status = 'DONE'`.
3. Fetch the task's `createdById` + project title for notification context.
4. Create a new `Message` (category: `UPDATE`) addressed to the task creator informing them the task is complete — including the assignee's resolution comment.

**New logic (pseudo-code):**
```ts
// After marking receipt done...
const message = await prisma.message.findUnique({
  where: { id: messageId },
  include: { projectTask: { include: { project: true, createdBy: true } } }
})

if (message?.projectTaskId && message.projectTask) {
  const task = message.projectTask

  // 1. Sync ProjectTask status
  await prisma.projectTask.update({
    where: { id: task.id },
    data: { status: 'DONE' }
  })

  // 2. Notify the task creator (if different from the person completing it)
  if (task.createdById !== user.id) {
    await prisma.message.create({
      data: {
        subject: `Task Completed: ${task.title}`,
        content: `${user.name} has completed the task "${task.title}" in project "${task.project.title}".\n\nResolution comment:\n${comment}`,
        category: 'UPDATE',
        priority: 'MEDIUM',
        senderId: user.id,
        customerName: task.project.customer?.name ?? null,
        receipts: { create: { userId: task.createdById } }
      }
    })
  }
}
```

---

### 4 — `CRMTaskSection` — No changes needed for status sync

Since the receipt API will now update `ProjectTask.status` server-side, the CRM project page will reflect the correct status on the next `fetchProject()` call (which is already triggered on every page load). No frontend changes are needed in `CRMTaskSection.tsx`.

However, there is a **UX improvement** available:

#### [MODIFY] [CRMTaskSection.tsx](file:///var/www/html/internal-crm/active-hardware-ims/components/crm/CRMTaskSection.tsx)

`toggleTask()` currently only toggles between `TODO` ↔ `DONE` with no notification. For tasks completed from the inbox (server-driven), this is fine. But we can optionally add a visual indicator showing **who completed it** and **when**, by expanding the `Task` interface to include completion metadata from the receipt.

This is optional polish — not required for the bug fix.

---

### 5 — Messaging page — Minor UX fix

#### [MODIFY] [page.tsx — messaging](file:///var/www/html/internal-crm/active-hardware-ims/app/dashboard/messaging/page.tsx)

After `handleMarkDone` succeeds, we should add a label like **"Synced to CRM Project"** in the success notification to give users confidence the CRM was updated. This is purely cosmetic.

---

## Summary of Broken Flows and Fixes

| # | Broken Flow | Fix |
|---|---|---|
| 1 | `Message` has no link to `ProjectTask` | Add `projectTaskId` to `Message` schema |
| 2 | Receipt API doesn't update `ProjectTask.status` | Receipt API reads `projectTaskId` and updates task |
| 3 | Project owner gets no notification | Receipt API creates an `UPDATE` message to task creator |
| 4 | CRM task shows `TODO` after inbox completion | Fixed by #2 — ProjectTask is now updated server-side |

---

## Verification Plan

### Automated / Manual Steps
1. Run Prisma migration to add `projectTaskId` to `Message`.
2. Create a new CRM project task assigned to a user → verify a message appears in that user's inbox.
3. From the inbox, add a resolution comment and click "Complete Task".
4. Verify:
   - [ ] `MessageReceipt.isDone = true` in the database.
   - [ ] `ProjectTask.status = 'DONE'` in the database.
   - [ ] The task creator receives a new `UPDATE` message in their inbox.
   - [ ] The CRM project Tasks tab shows the task as checked off.
5. Test role-assigned tasks (same flow, different receipt setup).
