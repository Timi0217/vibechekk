/**
 * Server-side constants and configuration values
 */

// Rate Limiting
export const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
export const RATE_LIMIT_MAX_REQUESTS = 60;

// Tier Limits (hourly usage)
export const TIER_LIMITS = {
  GUEST: 2,
  AUTHENTICATED: 3,
  PRO: Infinity,
} as const;

// Cache Durations (in minutes)
export const CACHE_DURATIONS = {
  FRESH_REPORT: 30, // Return cached if < 30 min old
  STALE_REPORT: 2 * 24 * 60, // Force update if > 2 days old
  ENRICHMENT: 30 * 24 * 60, // Enrichment data valid for 30 days
} as const;

// API Timeouts (in milliseconds)
export const API_TIMEOUTS = {
  GITHUB_REQUEST: 10000,
  DEEPSEEK_REQUEST: 30000,
  EMAIL_LOOKUP: 20000,
} as const;

// JWT Configuration
export const JWT_EXPIRY = '30d';

// Stripe Configuration
export const STRIPE_PRICE_ID_DEFAULT = 'price_1SkDqDLd8BonO0ZWPrwvJDL1';

// GitHub API
export const GITHUB_RATE_LIMIT = {
  MAX_REQUESTS_PER_HOUR: 5000,
  WARNING_THRESHOLD: 500,
  CRITICAL_THRESHOLD: 100,
} as const;

// Bulk Analysis Limits
export const BULK_LIMITS = {
  MAX_CANDIDATES_PER_REQUEST: 100,
  MAX_CONCURRENT_ANALYSES: 5,
} as const;

// DeepSeek API
export const DEEPSEEK_API_URL = 'https://api.deepseek.com/v1/chat/completions';
export const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY || '';

export type TierLevel = keyof typeof TIER_LIMITS;
