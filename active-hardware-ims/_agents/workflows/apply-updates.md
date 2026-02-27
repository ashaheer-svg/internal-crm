---
description: How to safely apply database schema updates for service fulfillment
---

# Safe Installation Process

Follow these steps to apply the latest changes and update your database schema without losing data.

### 1. Backup your Database
Before making any schema changes, always create a backup of your current data.
- Navigate to the `prisma/` directory.
- Copy `dev.db` to a safe location (e.g., `dev_backup.db`).

### 2. Apply Schema Changes
Run the following command in your terminal. This will create a migration record and update your database structure.
// turbo
```powershell
npx prisma migrate dev --name add_service_fulfillment_fields
```

### 3. Generate Prisma Client
Update your local type definitions to recognize the new fields.
// turbo
```powershell
npx prisma generate
```

### 4. Restart Dev Server
If you have the application running, stop it and start it again to load the new changes.
```powershell
npm run dev
```

### 5. Verification
- Open the dashboard.
- Go to a Delivery Order in "Building" status.
- You should now see the "Fulfill Service" button for service items, including the "Unit Cost" field.

---

# Production Server Deployment

If you are updating a **Production Server**, follow these steps to ensure zero data loss.

### 1. External Database Backup
Before any update, use your hosting provider's tool (e.g., SQLite backup, AWS Snapshot, etc.) to create a full recovery point.

### 2. Deploy Code Changes
Commit and push your current changes to your production branch (e.g., `main` or `production`).

### 3. Apply Production Migrations
Do **NOT** use `migrate dev` on production. Instead, use the `deploy` command which only applies pending migrations without resetting the database.

```bash
npx prisma migrate deploy
```

### 4. Regenerate and Rebuild
Ensure the server environment has the latest Prisma state and a fresh build.

```bash
npx prisma generate
npm run build
```

### 5. Restart Services
Restart your process manager (e.g., PM2, Systemd) to apply the new code.
