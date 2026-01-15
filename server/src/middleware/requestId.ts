import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';

/**
 * Adds a unique request ID to each request for tracking and debugging
 */
export const requestIdMiddleware = (req: Request, res: Response, next: NextFunction) => {
  // Generate unique ID for this request
  const requestId = randomUUID();

  // Attach to request object for access in route handlers
  (req as any).id = requestId;

  // Add to response headers for client-side tracking
  res.setHeader('X-Request-ID', requestId);

  // Log request start
  console.log(`[${requestId}] ${req.method} ${req.path}`);

  next();
};
