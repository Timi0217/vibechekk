import { Octokit } from 'octokit';

interface RateLimitStatus {
  remaining: number;
  limit: number;
  reset: Date;
  used: number;
  percentUsed: number;
}

/**
 * Track and monitor GitHub API rate limits
 */
export class GitHubRateLimitTracker {
  private octokit: Octokit;
  private lastCheck: Date | null = null;
  private cachedStatus: RateLimitStatus | null = null;
  private readonly CACHE_DURATION_MS = 60 * 1000; // Cache for 1 minute

  constructor(token: string) {
    this.octokit = new Octokit({ auth: token });
  }

  /**
   * Get current rate limit status (with 1-minute cache)
   */
  async getStatus(): Promise<RateLimitStatus> {
    // Return cached status if recent
    if (this.cachedStatus && this.lastCheck) {
      const age = Date.now() - this.lastCheck.getTime();
      if (age < this.CACHE_DURATION_MS) {
        return this.cachedStatus;
      }
    }

    try {
      const { data: rateLimit } = await this.octokit.rest.rateLimit.get();
      const core = rateLimit.resources.core;

      this.cachedStatus = {
        remaining: core.remaining,
        limit: core.limit,
        reset: new Date(core.reset * 1000),
        used: core.used,
        percentUsed: ((core.used / core.limit) * 100)
      };

      this.lastCheck = new Date();

      // Log warnings for low rates
      if (core.remaining < 100) {
        console.warn(`[GitHub Rate Limit] 🚨 CRITICAL: Only ${core.remaining} requests remaining (resets at ${this.cachedStatus.reset.toISOString()})`);
      } else if (core.remaining < 500) {
        console.warn(`[GitHub Rate Limit] ⚠️  LOW: ${core.remaining} requests remaining`);
      }

      return this.cachedStatus;
    } catch (error: any) {
      console.error('[GitHub Rate Limit] Failed to fetch rate limit:', error.message);

      // Return a conservative estimate if we can't fetch
      return {
        remaining: 0,
        limit: 5000,
        reset: new Date(Date.now() + 3600000), // 1 hour from now
        used: 5000,
        percentUsed: 100
      };
    }
  }

  /**
   * Check if we have enough quota remaining for an operation
   */
  async hasQuota(required: number = 10): Promise<boolean> {
    const status = await this.getStatus();
    return status.remaining >= required;
  }

  /**
   * Wait until rate limit resets (for queued operations)
   */
  async waitForReset(): Promise<void> {
    const status = await this.getStatus();
    const now = Date.now();
    const resetTime = status.reset.getTime();
    const waitMs = Math.max(0, resetTime - now);

    if (waitMs > 0) {
      console.log(`[GitHub Rate Limit] Waiting ${Math.round(waitMs / 1000)}s for rate limit reset...`);
      await new Promise(resolve => setTimeout(resolve, waitMs + 1000)); // Add 1s buffer
    }
  }

  /**
   * Get human-readable status summary
   */
  async getSummary(): Promise<string> {
    const status = await this.getStatus();
    const minutesUntilReset = Math.ceil((status.reset.getTime() - Date.now()) / 60000);

    return `GitHub API: ${status.remaining}/${status.limit} requests remaining (${status.percentUsed.toFixed(1)}% used, resets in ${minutesUntilReset}m)`;
  }

  /**
   * Log current rate limit status
   */
  async logStatus(): Promise<void> {
    const summary = await this.getSummary();
    console.log(`[GitHub Rate Limit] ${summary}`);
  }
}

// Singleton instance (created on first use)
let globalTracker: GitHubRateLimitTracker | null = null;

/**
 * Get or create the global rate limit tracker
 */
export function getRateLimitTracker(token: string): GitHubRateLimitTracker {
  if (!globalTracker) {
    globalTracker = new GitHubRateLimitTracker(token);
  }
  return globalTracker;
}
