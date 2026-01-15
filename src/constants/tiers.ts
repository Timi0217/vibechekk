/**
 * Subscription tier limits and configurations
 */

export const TIER_LIMITS = {
  GUEST: 2,
  AUTHENTICATED: 3,
  PRO: Infinity,
} as const;

export const TIER_NAMES = {
  GUEST: 'Guest',
  AUTHENTICATED: 'Authenticated',
  PRO: 'Pro',
} as const;

export type TierLevel = keyof typeof TIER_LIMITS;
