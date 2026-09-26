// packages/db/src/index.ts
import { PrismaClient } from "@prisma/client";

// Singleton so dev's hot-reload doesn't spawn a new connection pool per edit.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient();
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

export type { Lead } from "@prisma/client";