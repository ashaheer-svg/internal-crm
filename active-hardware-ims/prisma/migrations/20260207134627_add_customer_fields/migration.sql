-- AlterTable
ALTER TABLE "Customer" ADD COLUMN "contactName" TEXT;
ALTER TABLE "Customer" ADD COLUMN "salesRep" TEXT;

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Session" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Session" ("createdAt", "expiresAt", "id", "token", "userId") SELECT "createdAt", "expiresAt", "id", "token", "userId" FROM "Session";
DROP TABLE "Session";
ALTER TABLE "new_Session" RENAME TO "Session";
CREATE UNIQUE INDEX "Session_token_key" ON "Session"("token");
CREATE INDEX "Session_userId_idx" ON "Session"("userId");
CREATE INDEX "Session_token_idx" ON "Session"("token");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
