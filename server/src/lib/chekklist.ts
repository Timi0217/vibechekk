/**
 * Chekklist Phase 2 - Smart Developer Search
 *
 * Searches internal database of analyzed profiles with filters:
 * - Languages (must have at least 30% of requested)
 * - Seniority (Junior/Mid/Senior)
 * - Archetype (10x Engineer, Builder, etc.)
 * - Reverse search (find developers like X)
 *
 * Returns top 50 results ranked by match + reachability score
 * Filters out profiles with reachability < 60 OR no email
 */

import { PrismaClient } from '@prisma/client';
import { calculateSeniority, UserStats } from './seniority.js';
import { calculateReachability, ReachabilityData, getReachabilityBadge } from './reachability.js';

const prisma = new PrismaClient();

export interface SearchFilters {
  languages?: string[];        // e.g., ["TypeScript", "Python"]
  seniority?: 'Junior' | 'Mid' | 'Senior';
  archetype?: string;          // e.g., "10x Engineer", "Builder"
  reverseUsername?: string;    // Find developers like this GitHub user
}

export interface SearchResult {
  githubHandle: string;
  name: string;
  avatarUrl: string;
  email: string;
  seniority: string;
  archetype: string;
  matchScore: number;           // 0-100, overall relevance
  reachabilityScore: number;    // 0-100
  reachabilityBadge: {
    color: 'green' | 'yellow' | 'red';
    label: string;
    emoji: string;
  };
  reachabilityIndicators: string[];
  stats: {
    totalCommits: number;
    totalRepos: number;
    totalStars: number;
    languages: string[];
  };
}

/**
 * Main search function
 * Returns top 50 results that meet reachability requirements
 */
export async function searchChekklist(filters: SearchFilters): Promise<SearchResult[]> {
  console.log('[Chekklist] Search filters:', JSON.stringify(filters));

  // Step 1: Get all analyzed profiles from database
  const reports = await prisma.vibeReport.findMany({
    where: {
      // Only include profiles with successful analysis
      archetype: { not: null },
      confidence: { gte: 50 }
    },
    include: {
      candidate: true
    },
    orderBy: {
      createdAt: 'desc'
    }
  });

  console.log(`[Chekklist] Found ${reports.length} analyzed profiles in database`);

  // Step 2: Extract and deduplicate candidates
  const candidateMap = new Map<string, any>();

  for (const report of reports) {
    const handle = report.candidate.githubHandle;

    // Keep most recent report per candidate
    if (!candidateMap.has(handle)) {
      candidateMap.set(handle, {
        report,
        candidate: report.candidate
      });
    }
  }

  console.log(`[Chekklist] Unique candidates: ${candidateMap.size}`);

  // Step 3: Get reference profile for reverse search
  let referenceStats: UserStats | null = null;
  if (filters.reverseUsername) {
    const referenceCandidate = await prisma.candidate.findFirst({
      where: { githubHandle: filters.reverseUsername },
      include: { reports: { orderBy: { createdAt: 'desc' }, take: 1 } }
    });

    if (referenceCandidate && referenceCandidate.reports[0]) {
      const refMetadata = referenceCandidate.reports[0].metadata as any;
      referenceStats = extractUserStats(refMetadata, referenceCandidate);
    } else {
      console.warn(`[Chekklist] Reference user ${filters.reverseUsername} not found in database`);
    }
  }

  // Step 4: Score and filter all candidates
  const scoredCandidates: Array<{
    candidate: any;
    report: any;
    matchScore: number;
    reachability: any;
    stats: UserStats;
  }> = [];

  for (const [handle, data] of candidateMap) {
    const { report, candidate } = data;
    const metadata = report.metadata as any;

    // Extract stats
    const stats = extractUserStats(metadata, candidate);

    // Calculate seniority
    const seniorityResult = calculateSeniority(stats);

    // Filter by seniority if specified
    if (filters.seniority && seniorityResult.seniority !== filters.seniority) {
      continue;
    }

    // Filter by archetype if specified
    if (filters.archetype && report.archetype !== filters.archetype) {
      continue;
    }

    // Filter by languages if specified (must have at least 30% of requested)
    if (filters.languages && filters.languages.length > 0) {
      const matchedLanguages = filters.languages.filter(lang =>
        stats.languages.some(userLang => userLang.toLowerCase() === lang.toLowerCase())
      );
      const matchPercentage = (matchedLanguages.length / filters.languages.length) * 100;

      if (matchPercentage < 30) {
        continue;
      }
    }

    // Calculate reachability
    const reachabilityData: ReachabilityData = {
      email: candidate.email || candidate.workEmail,
      workEmail: candidate.workEmail,
      linkedinUrl: candidate.linkedinUrl,
      twitterUrl: candidate.twitterUrl,
      lastCommitDate: metadata?.userStats?.lastCommitDate || null,
      followers: metadata?.userStats?.followers || 0,
      following: metadata?.userStats?.following || 0,
      bio: metadata?.userStats?.bio || null,
      blog: metadata?.userStats?.blog || null,
      company: metadata?.userStats?.company || null,
      location: candidate.location || null,
      hireable: metadata?.userStats?.hireable || null
    };

    const reachability = calculateReachability(reachabilityData);

    // HARD FILTER: Reachability >= 60 AND email present
    if (!reachability.meetsMinimum) {
      continue;
    }

    // Calculate match score
    let matchScore = 50; // Base score

    // Reverse search similarity (if enabled)
    if (referenceStats) {
      const similarity = calculateSimilarity(referenceStats, stats);
      matchScore = similarity * 0.6 + reachability.score * 0.4;
    } else {
      // No reverse search: rank by reachability + profile quality
      const qualityScore = calculateQualityScore(stats);
      matchScore = qualityScore * 0.6 + reachability.score * 0.4;
    }

    scoredCandidates.push({
      candidate,
      report,
      matchScore: Math.round(matchScore),
      reachability,
      stats
    });
  }

  console.log(`[Chekklist] Candidates passing filters: ${scoredCandidates.length}`);

  // Step 5: Sort by match score and take top 50
  scoredCandidates.sort((a, b) => b.matchScore - a.matchScore);
  const top50 = scoredCandidates.slice(0, 50);

  // Step 6: Format results
  const results: SearchResult[] = top50.map(item => {
    const badge = getReachabilityBadge(item.reachability.score, item.reachability.hasEmail);

    return {
      githubHandle: item.candidate.githubHandle,
      name: item.candidate.name || item.candidate.githubHandle,
      avatarUrl: item.candidate.photoUrl || `https://github.com/${item.candidate.githubHandle}.png`,
      email: item.candidate.email || item.candidate.workEmail || '',
      seniority: calculateSeniority(item.stats).seniority,
      archetype: item.report.archetype,
      matchScore: item.matchScore,
      reachabilityScore: item.reachability.score,
      reachabilityBadge: badge,
      reachabilityIndicators: item.reachability.indicators,
      stats: {
        totalCommits: item.stats.totalCommits,
        totalRepos: item.stats.totalRepos,
        totalStars: item.stats.totalStars,
        languages: item.stats.languages
      }
    };
  });

  console.log(`[Chekklist] Returning ${results.length} results`);
  return results;
}

/**
 * Extract user stats from report metadata
 */
function extractUserStats(metadata: any, candidate: any): UserStats {
  return {
    totalCommits: metadata?.userStats?.totalCommits || 0,
    totalRepos: metadata?.userStats?.totalRepos || 0,
    totalStars: metadata?.userStats?.totalStars || 0,
    languages: metadata?.userStats?.languages || [],
    accountCreatedAt: metadata?.userStats?.accountCreatedAt || candidate.createdAt || new Date().toISOString(),
    contributionYears: metadata?.userStats?.contributionYears
  };
}

/**
 * Calculate similarity between two profiles (for reverse search)
 */
function calculateSimilarity(reference: UserStats, candidate: UserStats): number {
  // Commit similarity (30%)
  const commitSim = 1 - Math.abs(reference.totalCommits - candidate.totalCommits) /
    Math.max(reference.totalCommits, candidate.totalCommits, 1);

  // Repo similarity (20%)
  const repoSim = 1 - Math.abs(reference.totalRepos - candidate.totalRepos) /
    Math.max(reference.totalRepos, candidate.totalRepos, 1);

  // Star similarity (15%)
  const starSim = 1 - Math.abs(reference.totalStars - candidate.totalStars) /
    Math.max(reference.totalStars, candidate.totalStars, 1);

  // Language overlap (25%)
  const commonLangs = reference.languages.filter(lang =>
    candidate.languages.some(cLang => cLang.toLowerCase() === lang.toLowerCase())
  );
  const langSim = commonLangs.length / Math.max(reference.languages.length, candidate.languages.length, 1);

  // Seniority match (10%)
  const refSeniority = calculateSeniority(reference);
  const candSeniority = calculateSeniority(candidate);
  const seniorSim = refSeniority.seniority === candSeniority.seniority ? 1 : 0.5;

  return (commitSim * 0.30 + repoSim * 0.20 + starSim * 0.15 + langSim * 0.25 + seniorSim * 0.10) * 100;
}

/**
 * Calculate quality score for profiles (when no reverse search)
 */
function calculateQualityScore(stats: UserStats): number {
  const seniorityResult = calculateSeniority(stats);

  // Higher seniority = higher quality
  let score = seniorityResult.score;

  // Bonus for strong repos
  if (stats.totalStars > 100) score += 10;
  if (stats.totalRepos > 20) score += 5;

  return Math.min(score, 100);
}
