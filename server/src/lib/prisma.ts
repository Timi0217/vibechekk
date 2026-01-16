/**
 * Prisma Client Singleton
 *
 * Prevents memory leaks by ensuring only one PrismaClient instance
 * is created across the entire application lifecycle.
 */

import { PrismaClient } from '@prisma/client';

const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const prisma = globalForPrisma.prisma || new PrismaClient({
  log: process.env.NODE_ENV === 'production' ? ['error', 'warn'] : ['query', 'info', 'warn', 'error'],
});

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

// Graceful shutdown handler
export async function disconnectPrisma() {
  await prisma.$disconnect();
  console.log('[Prisma] Disconnected from database');
}
