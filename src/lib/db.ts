import { PrismaClient } from "@prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  (() => {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error("DATABASE_URL missing");

    const adapter = new PrismaBetterSqlite3({ url });
    return new PrismaClient({ adapter });
  })();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
