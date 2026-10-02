import "server-only";
import { PrismaClient } from "@/generated/prisma/client";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";

const createClient = () =>
  new PrismaClient({ adapter: new PrismaMariaDb(process.env.DATABASE_URL!) });

// One client across hot reloads in development, instead of a new pool per reload.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? createClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
