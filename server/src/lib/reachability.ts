/**
 * Reachability scoring algorithm
 *
 * Calculates how reachable/contactable a developer is based on:
 * - Contact info visible (40%)
 * - Recent activity (30%)
 * - Social presence (20%)
 * - Profile completeness (10%)
 *
 * Returns score 0-100
 * Minimum requirements: score >= 60 AND email present
 */

export interface ReachabilityData {
  // Contact info
  email?: string | null;
  workEmail?: string | null;
  linkedinUrl?: string | null;
  twitterUrl?: string | null;

  // Activity (from GitHub stats)
  lastCommitDate?: string | null;

  // Social presence (from GitHub)
  followers?: number;
  following?: number;

  // Profile completeness (from GitHub)
  bio?: string | null;
  blog?: string | null;
  company?: string | null;
  location?: string | null;
  hireable?: boolean | null;
}

export interface ReachabilityResult {
  score: number;
  hasEmail: boolean;
  meetsMinimum: boolean; // score >= 60 AND hasEmail
  breakdown: {
    contactInfo: number;
    recentActivity: number;
    socialPresence: number;
    profileCompleteness: number;
  };
  indicators: string[]; // Human-readable indicators (e.g., "Email visible", "Last active: 2 days ago")
}

/**
 * Calculate reachability score (0-100)
 */
export function calculateReachability(data: ReachabilityData): ReachabilityResult {
  const indicators: string[] = [];

  // 1. Contact Info (40 points max)
  let contactInfo = 0;
  const hasEmail = !!(data.email || data.workEmail);

  if (hasEmail) {
    contactInfo += 40;
    indicators.push('📧 Email visible');
  }

  if (data.linkedinUrl) {
    contactInfo += 20;
    indicators.push('💼 LinkedIn linked');
  }

  if (data.twitterUrl) {
    contactInfo += 20;
    indicators.push('🐦 Twitter linked');
  }

  // Cap at 40 points
  contactInfo = Math.min(contactInfo, 40);

  // 2. Recent Activity (30 points max)
  let recentActivity = 0;
  if (data.lastCommitDate) {
    const daysSinceLastCommit = getDaysSince(data.lastCommitDate);

    if (daysSinceLastCommit <= 7) {
      recentActivity = 30;
      indicators.push(`✅ Last active: ${daysSinceLastCommit}d ago`);
    } else if (daysSinceLastCommit <= 30) {
      recentActivity = 25;
      indicators.push(`✅ Last active: ${daysSinceLastCommit}d ago`);
    } else if (daysSinceLastCommit <= 90) {
      recentActivity = 15;
      indicators.push(`⚠️ Last active: ${daysSinceLastCommit}d ago`);
    } else if (daysSinceLastCommit <= 180) {
      recentActivity = 5;
      indicators.push(`⚠️ Last active: ${Math.round(daysSinceLastCommit / 30)}mo ago`);
    } else {
      recentActivity = 0;
      indicators.push(`❌ Inactive (${Math.round(daysSinceLastCommit / 30)}mo+)`);
    }
  } else {
    indicators.push('⚠️ Activity unknown');
  }

  // 3. Social Presence (20 points max)
  let socialPresence = 0;
  const followers = data.followers || 0;

  if (followers >= 500) {
    socialPresence = 20;
    indicators.push(`👥 ${followers} followers`);
  } else if (followers >= 100) {
    socialPresence = 15;
    indicators.push(`👥 ${followers} followers`);
  } else if (followers >= 50) {
    socialPresence = 10;
  } else if (followers >= 10) {
    socialPresence = 5;
  }

  // Bonus for following others (indicates active participation)
  if (data.following && data.following > 20) {
    socialPresence = Math.min(socialPresence + 5, 20);
  }

  // 4. Profile Completeness (10 points max)
  let profileCompleteness = 0;

  if (data.bio && data.bio.trim().length > 10) {
    profileCompleteness += 3;
  }

  if (data.blog) {
    profileCompleteness += 3;
    indicators.push('🌐 Website/blog');
  }

  if (data.company) {
    profileCompleteness += 2;
  }

  if (data.location) {
    profileCompleteness += 2;
  }

  if (data.hireable) {
    profileCompleteness += 2;
    indicators.push('💼 Open to opportunities');
  }

  // Cap at 10 points
  profileCompleteness = Math.min(profileCompleteness, 10);

  // Total score
  const totalScore = contactInfo + recentActivity + socialPresence + profileCompleteness;

  // Check if meets minimum requirements
  const meetsMinimum = totalScore >= 60 && hasEmail;

  return {
    score: Math.round(totalScore),
    hasEmail,
    meetsMinimum,
    breakdown: {
      contactInfo,
      recentActivity,
      socialPresence,
      profileCompleteness
    },
    indicators
  };
}

/**
 * Get days since a date
 */
function getDaysSince(dateString: string): number {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * Get reachability badge based on score
 */
export function getReachabilityBadge(score: number, hasEmail: boolean): {
  color: 'green' | 'yellow' | 'red';
  label: string;
  emoji: string;
} {
  if (score >= 60 && hasEmail) {
    return { color: 'green', label: 'High Reachability', emoji: '🟢' };
  } else if (score >= 40 && hasEmail) {
    return { color: 'yellow', label: 'Medium Reachability', emoji: '🟡' };
  } else {
    return { color: 'red', label: 'Low Reachability', emoji: '🔴' };
  }
}

/**
 * Filter candidates by minimum reachability requirements
 * (score >= 60 AND email present)
 */
export function filterByReachability(
  candidates: Array<{ data: ReachabilityData; [key: string]: any }>
): Array<{ data: ReachabilityData; reachability: ReachabilityResult; [key: string]: any }> {
  return candidates
    .map(candidate => ({
      ...candidate,
      reachability: calculateReachability(candidate.data)
    }))
    .filter(candidate => candidate.reachability.meetsMinimum);
}
