-- Mission Control: add Memory table for persistent agent memory

CREATE TABLE "Memory" (
    "path"      TEXT     NOT NULL PRIMARY KEY,
    "content"   TEXT     NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
