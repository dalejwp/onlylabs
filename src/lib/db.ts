import { PrismaClient } from "@prisma/client";
import Database from "better-sqlite3";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  (() => {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error("DATABASE_URL missing");

    // DATABASE_URL format: file:./mission-control.db
    const filePath = url.replace(/^file:/, "");
    const db = new Database(filePath);
    const adapter = new PrismaBetterSqlite3(db);

    return new PrismaClient({ adapter });
  })();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
