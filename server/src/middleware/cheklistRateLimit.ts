/**
 * Rate limiting middleware for Chekklist searches
 *
 * Limits:
 * - PRO users: 3 searches per day
 * - FREE/AUTHENTICATED users: 0 (feature locked)
 * - GUEST users: 0 (feature locked)
 *
 * Resets daily at midnight UTC
 */

import { prisma } from '../lib/prisma.js';
import { Request, Response, NextFunction } from 'express';

const CHEKKLIST_LIMITS = {
  PRO: 3,
  AUTHENTICATED: 0,
  GUEST: 0
};

export async function checkCheklistLimit(req: Request, res: Response, next: NextFunction) {
  const user = (req as any).user;

  if (!user) {
    return res.status(401).json({
      success: false,
      error: 'Chekklist is a PRO feature. Please upgrade to access developer search.',
      code: 'CHEKKLIST_PRO_ONLY'
    });
  }

  // Only PRO users can use Chekklist
  if (user.tier !== 'PRO') {
    return res.status(403).json({
      success: false,
      error: 'Chekklist is a PRO feature. Upgrade to search for developers matching your criteria.',
      code: 'CHEKKLIST_PRO_ONLY',
      upgradeUrl: '/api/stripe/create-checkout'
    });
  }

  try {
    // Get today's date range (UTC)
    const now = new Date();
    const startOfDay = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0));
    const endOfDay = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 23, 59, 59, 999));

    // Count searches today
    const searchesToday = await prisma.cheklistSearch.count({
      where: {
        userId: user.id,
        createdAt: {
          gte: startOfDay,
          lte: endOfDay
        }
      }
    });

    const limit = CHEKKLIST_LIMITS.PRO;
    const remaining = Math.max(0, limit - searchesToday);

    if (searchesToday >= limit) {
      return res.status(429).json({
        success: false,
        error: `You've used all ${limit} Chekklist searches for today. Resets at midnight UTC.`,
        code: 'CHEKKLIST_LIMIT_REACHED',
        limit,
        used: searchesToday,
        remaining: 0,
        nextResetAt: new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1, 0, 0, 0, 0)).toISOString()
      });
    }

    // Attach search stats to request for use in handler
    (req as any).cheklistStats = {
      limit,
      used: searchesToday,
      remaining: remaining - 1 // -1 because this request will count
    };

    next();
  } catch (error) {
    console.error('[Chekklist Rate Limit] Error:', error);
    // Fallback: allow request if DB check fails
    next();
  }
}

/**
 * Get remaining searches for a user
 */
export async function getCheklistSearchesRemaining(userId: string): Promise<{
  limit: number;
  used: number;
  remaining: number;
  nextResetAt: string;
}> {
  const now = new Date();
  const startOfDay = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0));
  const endOfDay = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 23, 59, 59, 999));

  const searchesToday = await prisma.cheklistSearch.count({
    where: {
      userId,
      createdAt: {
        gte: startOfDay,
        lte: endOfDay
      }
    }
  });

  const limit = CHEKKLIST_LIMITS.PRO;
  const remaining = Math.max(0, limit - searchesToday);

  return {
    limit,
    used: searchesToday,
    remaining,
    nextResetAt: new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1, 0, 0, 0, 0)).toISOString()
  };
}

/**
 * Record a Chekklist search
 */
export async function recordCheklistSearch(
  userId: string,
  filters: {
    languages?: string[];
    seniority?: string;
    archetype?: string;
    reverseUsername?: string;
  },
  resultCount: number
): Promise<void> {
  const searchType = [
    filters.reverseUsername && 'reverse',
    filters.archetype && 'archetype',
    filters.seniority && 'seniority',
    filters.languages && filters.languages.length > 0 && 'languages'
  ].filter(Boolean).join('+') || 'combined';

  await prisma.cheklistSearch.create({
    data: {
      userId,
      searchType,
      reverseUsername: filters.reverseUsername || null,
      archetype: filters.archetype || null,
      seniority: filters.seniority || null,
      languages: filters.languages || [],
      resultCount
    }
  });
}
