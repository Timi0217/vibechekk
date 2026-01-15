/**
 * Seniority scoring algorithm
 *
 * Calculates developer seniority based on multiple factors:
 * - Commit velocity (30%)
 * - Repo complexity (25%)
 * - Language diversity (15%)
 * - Contribution patterns (15%)
 * - Account age (15%)
 *
 * Returns: "Junior" (0-40), "Mid" (41-70), "Senior" (71-100)
 */

export interface UserStats {
  totalCommits: number;
  totalRepos: number;
  totalStars: number;
  languages: string[];
  accountCreatedAt: string;
  contributionYears?: number;
}

export interface SeniorityResult {
  seniority: 'Junior' | 'Mid' | 'Senior';
  score: number;
  breakdown: {
    commitVelocity: number;
    repoComplexity: number;
    languageDiversity: number;
    contributionPattern: number;
    accountAge: number;
  };
}

/**
 * Calculate seniority score (0-100) based on user stats
 */
export function calculateSeniority(stats: UserStats): SeniorityResult {
  const accountAgeYears = calculateAccountAge(stats.accountCreatedAt);
  const contributionYears = stats.contributionYears || accountAgeYears;

  // 1. Commit Velocity (30 points max)
  // Commits per year: 0-50 = 0pts, 50-200 = 15pts, 200-500 = 25pts, 500+ = 30pts
  const commitsPerYear = stats.totalCommits / Math.max(contributionYears, 1);
  let commitVelocity = 0;
  if (commitsPerYear >= 500) commitVelocity = 30;
  else if (commitsPerYear >= 200) commitVelocity = 25;
  else if (commitsPerYear >= 100) commitVelocity = 20;
  else if (commitsPerYear >= 50) commitVelocity = 15;
  else commitVelocity = Math.min((commitsPerYear / 50) * 15, 15);

  // 2. Repo Complexity (25 points max)
  // Factors: stars per repo, total repos, avg stars
  const reposCount = Math.min(stats.totalRepos, 100); // Cap at 100 for scoring
  const avgStarsPerRepo = stats.totalRepos > 0 ? stats.totalStars / stats.totalRepos : 0;

  let repoComplexity = 0;
  // Repos count contribution (up to 10pts)
  if (reposCount >= 30) repoComplexity += 10;
  else if (reposCount >= 15) repoComplexity += 7;
  else if (reposCount >= 5) repoComplexity += 5;
  else repoComplexity += Math.min((reposCount / 5) * 5, 5);

  // Stars contribution (up to 15pts)
  if (avgStarsPerRepo >= 50) repoComplexity += 15;
  else if (avgStarsPerRepo >= 20) repoComplexity += 12;
  else if (avgStarsPerRepo >= 5) repoComplexity += 8;
  else if (avgStarsPerRepo >= 1) repoComplexity += 5;
  else if (stats.totalStars >= 10) repoComplexity += 3;

  // 3. Language Diversity (15 points max)
  // More languages = broader technical knowledge
  const languageCount = stats.languages.length;
  let languageDiversity = 0;
  if (languageCount >= 10) languageDiversity = 15;
  else if (languageCount >= 7) languageDiversity = 12;
  else if (languageCount >= 5) languageDiversity = 10;
  else if (languageCount >= 3) languageDiversity = 7;
  else if (languageCount >= 2) languageDiversity = 5;
  else languageDiversity = Math.min(languageCount * 2.5, 5);

  // 4. Contribution Pattern (15 points max)
  // Consistency: total commits / account age
  // High ratio = consistent contributor
  const consistencyRatio = stats.totalCommits / Math.max(accountAgeYears, 0.5);
  let contributionPattern = 0;
  if (consistencyRatio >= 300) contributionPattern = 15;
  else if (consistencyRatio >= 200) contributionPattern = 12;
  else if (consistencyRatio >= 100) contributionPattern = 10;
  else if (consistencyRatio >= 50) contributionPattern = 7;
  else contributionPattern = Math.min((consistencyRatio / 50) * 7, 7);

  // 5. Account Age (15 points max)
  // Experience over time
  let accountAge = 0;
  if (accountAgeYears >= 7) accountAge = 15;
  else if (accountAgeYears >= 5) accountAge = 12;
  else if (accountAgeYears >= 3) accountAge = 10;
  else if (accountAgeYears >= 2) accountAge = 7;
  else if (accountAgeYears >= 1) accountAge = 5;
  else accountAge = Math.min(accountAgeYears * 5, 5);

  // Total score
  const totalScore = Math.round(
    commitVelocity + repoComplexity + languageDiversity + contributionPattern + accountAge
  );

  // Determine seniority tier
  let seniority: 'Junior' | 'Mid' | 'Senior';
  if (totalScore >= 71) seniority = 'Senior';
  else if (totalScore >= 41) seniority = 'Mid';
  else seniority = 'Junior';

  return {
    seniority,
    score: totalScore,
    breakdown: {
      commitVelocity,
      repoComplexity,
      languageDiversity,
      contributionPattern,
      accountAge
    }
  };
}

/**
 * Calculate account age in years
 */
function calculateAccountAge(createdAt: string): number {
  const created = new Date(createdAt);
  const now = new Date();
  const ageInMs = now.getTime() - created.getTime();
  const ageInYears = ageInMs / (1000 * 60 * 60 * 24 * 365);
  return Math.max(ageInYears, 0.1); // Minimum 0.1 years to avoid division by zero
}

/**
 * Batch calculate seniority for multiple users
 */
export function calculateSeniorityBatch(users: UserStats[]): Map<string, SeniorityResult> {
  const results = new Map<string, SeniorityResult>();

  for (const user of users) {
    // Use githubHandle or email as key if available (caller should provide)
    const result = calculateSeniority(user);
    results.set(JSON.stringify(user), result);
  }

  return results;
}
