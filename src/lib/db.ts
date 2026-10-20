import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient } from "@/generated/prisma/client";

// Reuse one client across dev hot reloads.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function createClient() {
  const url = process.env.DATABASE_URL;
  // Without this the driver fails later with an unreadable "prepareCacheLength" error.
  if (!url) throw new Error("DATABASE_URL is not set. Copy .env.example to .env and fill it in.");
  return new PrismaClient({ adapter: new PrismaMariaDb(url) });
}

export const prisma = globalForPrisma.prisma ?? createClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

// Badges plus pending new-badge requests; both count toward the quota.
export async function usedSlots(userId: string) {
  const [badges, pendingNew] = await Promise.all([
    prisma.badge.count({ where: { userId } }),
    prisma.badgeRequest.count({ where: { userId, status: "PENDING", badgeId: null } }),
  ]);
  return badges + pendingNew;
}
