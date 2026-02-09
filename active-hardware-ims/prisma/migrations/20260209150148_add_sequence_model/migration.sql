-- CreateTable
CREATE TABLE "Sequence" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nextNumber" INTEGER NOT NULL DEFAULT 1,
    "lastYearMonth" TEXT,
    "prefix" TEXT NOT NULL,
    "updatedAt" DATETIME NOT NULL
);
