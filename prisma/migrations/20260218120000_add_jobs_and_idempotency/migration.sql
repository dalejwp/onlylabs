-- Mission Control: add IdempotencyRecord and Job tables

-- CreateTable
CREATE TABLE "IdempotencyRecord" (
    "key"       TEXT     NOT NULL PRIMARY KEY,
    "status"    INTEGER  NOT NULL,
    "body"      TEXT     NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Job" (
    "id"             TEXT     NOT NULL PRIMARY KEY,
    "jobType"        TEXT     NOT NULL,
    "payload"        TEXT     NOT NULL,
    "status"         TEXT     NOT NULL DEFAULT 'pending',
    "attempts"       INTEGER  NOT NULL DEFAULT 0,
    "maxAttempts"    INTEGER  NOT NULL DEFAULT 3,
    "lastError"      TEXT,
    "idempotencyKey" TEXT,
    "createdAt"      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "runAt"          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"      DATETIME NOT NULL
);

-- CreateIndex
CREATE INDEX "IdempotencyRecord_expiresAt_idx" ON "IdempotencyRecord"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "Job_idempotencyKey_key" ON "Job"("idempotencyKey");

-- CreateIndex
CREATE INDEX "Job_status_runAt_idx" ON "Job"("status", "runAt");
