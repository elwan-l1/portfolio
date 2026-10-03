import "server-only";
import { PrismaClient } from "@/generated/prisma/client";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";

const createClient = () =>
  new PrismaClient({ adapter: new PrismaMariaDb(process.env.DATABASE_URL!) });

// on globalThis so dev hot reloads reuse one pool
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

// created on first query, not at import: `next build` imports pages without a database
export const getPrisma = () => (globalForPrisma.prisma ??= createClient());
