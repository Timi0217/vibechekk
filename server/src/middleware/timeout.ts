/**
 * Request timeout middleware
 *
 * Prevents long-running requests from exhausting server resources.
 * Different timeouts for different endpoint types:
 * - Regular API calls: 30s
 * - Bulk operations: 3 minutes
 * - Webhooks: 25s (Stripe timeout is 30s)
 */

import { Request, Response, NextFunction } from 'express';

export interface TimeoutConfig {
  default: number;
  bulk: number;
  webhook: number;
}

const TIMEOUTS: TimeoutConfig = {
  default: 30000,   // 30 seconds
  bulk: 180000,     // 3 minutes for bulk operations
  webhook: 25000    // 25 seconds for webhooks
};

/**
 * Timeout middleware factory
 * Creates middleware with custom timeout duration
 */
export function timeout(ms?: number) {
  return (req: Request, res: Response, next: NextFunction) => {
    // Determine timeout based on route
    let timeoutMs = ms || TIMEOUTS.default;

    if (req.path.includes('/bulkchekk') || req.path.includes('/bulk')) {
      timeoutMs = TIMEOUTS.bulk;
    } else if (req.path.includes('/webhook')) {
      timeoutMs = TIMEOUTS.webhook;
    }

    const timeoutId = setTimeout(() => {
      if (!res.headersSent) {
        console.error(`[Timeout] Request timeout after ${timeoutMs}ms: ${req.method} ${req.path}`);
        res.status(408).json({
          success: false,
          error: 'Request timeout',
          code: 'TIMEOUT',
          message: `Request exceeded ${timeoutMs / 1000}s time limit`
        });
      }
    }, timeoutMs);

    // Clear timeout when response finishes
    res.on('finish', () => clearTimeout(timeoutId));
    res.on('close', () => clearTimeout(timeoutId));

    next();
  };
}

/**
 * Apply timeout to specific route
 */
export const timeoutShort = timeout(10000);   // 10s for fast operations
export const timeoutDefault = timeout(30000);  // 30s default
export const timeoutLong = timeout(180000);    // 3min for bulk operations
