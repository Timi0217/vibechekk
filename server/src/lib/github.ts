import { Octokit } from 'octokit';

export const fetchUserStats = async (token: string, username: string) => {
  const octokit = new Octokit({ auth: token });

  // Calculate date for 90 days ago
  const last90Days = new Date();
  last90Days.setDate(last90Days.getDate() - 90);

  const query = `
    query($username: String!, $from: DateTime!, $searchQuery: String!) {
      search(query: $searchQuery, type: REPOSITORY) {
        repositoryCount
      }
      user(login: $username) {
        name
        email
        createdAt
        updatedAt
        pullRequests(first: 1) { totalCount }
        issues(first: 1) { totalCount }
        starredRepositories(first: 1) { totalCount }
        contributionsCollection {
          totalCommitContributions
          totalRepositoriesWithContributedCommits
          restrictedContributionsCount
          contributionCalendar {
            totalContributions
            weeks {
              contributionDays {
                contributionCount
                date
                weekday
              }
            }
          }
        }
        recentActivity: contributionsCollection(from: $from) {
          totalCommitContributions
          restrictedContributionsCount
          contributionCalendar {
            totalContributions
          }
        }
        repositories(first: 100, ownerAffiliations: OWNER, privacy: PUBLIC, orderBy: {field: STARGAZERS, direction: DESC}) {
          totalCount
          nodes {
            stargazerCount
            isFork
            primaryLanguage { name }
            pushedAt
          }
        }
      }
    }
  `;

  try {
    const response: any = await octokit.graphql(query, {
      username,
      from: last90Days.toISOString(),
      searchQuery: `user:${username} fork:false`
    });

    if (!response.user) return null;

    const repos = response.user.repositories.nodes;

    // Find truly last active date from contribution calendar (includes private commits if user allows)
    const calendar = response.user.contributionsCollection.contributionCalendar;
    let lastContributionDate = null;
    if (calendar && calendar.weeks) {
      // Traverse weeks backwards
      for (let i = calendar.weeks.length - 1; i >= 0; i--) {
        const week = calendar.weeks[i];
        if (week.contributionDays) {
          // Traverse days backwards
          for (let j = week.contributionDays.length - 1; j >= 0; j--) {
            const day = week.contributionDays[j];
            if (day.contributionCount > 0) {
              lastContributionDate = day.date;
              break;
            }
          }
        }
        if (lastContributionDate) break;
      }
    }

    const lastPushedAt = repos.length > 0 ? repos.reduce((latest: string, r: any) => {
      if (!r.pushedAt) return latest;
      return !latest || new Date(r.pushedAt) > new Date(latest) ? r.pushedAt : latest;
    }, '') : null;

    return {
      totalStars: repos.reduce((sum: number, r: any) => sum + r.stargazerCount, 0),
      totalRepos: response.user.repositories.totalCount || response.search.repositoryCount,
      totalCommits: response.user.contributionsCollection.totalCommitContributions,
      externalContributions: response.user.contributionsCollection.totalRepositoriesWithContributedCommits,
      last90DaysCommits: response.user.recentActivity.contributionCalendar?.totalContributions || response.user.recentActivity.totalCommitContributions,
      createdAt: response.user.createdAt,
      updatedAt: response.user.updatedAt,
      name: response.user.name,
      email: response.user.email,
      pullRequests: response.user.pullRequests.totalCount,
      issues: response.user.issues.totalCount,
      starredRepositories: response.user.starredRepositories.totalCount,
      contributionCalendar: calendar,
      languages: [...new Set(repos.map((r: any) => r.primaryLanguage?.name).filter(Boolean))],
      forkRatio: repos.length > 0 ? repos.filter((r: any) => r.isFork).length / repos.length : 0,
      lastPushedAt: lastPushedAt,
      lastActive: lastContributionDate || lastPushedAt || response.user.updatedAt
    };
  } catch (error) {
    console.error('[GitHub] fetchUserStats failed:', error);
    return null;
  }
};

export const fetchCodeQualitySignals = async (token: string, owner: string, repo: string) => {
  const octokit = new Octokit({ auth: token });

  try {
    const { data: tree } = await octokit.rest.git.getTree({
      owner,
      repo,
      tree_sha: 'HEAD',
      recursive: '1'
    });

    const paths = tree.tree.map((item: any) => item.path);

    // Extract README for context
    let readmePreview = '';
    try {
      const { data: readme } = await octokit.rest.repos.getReadme({ owner, repo });
      const content = Buffer.from(readme.content, 'base64').toString('utf-8');
      readmePreview = content.substring(0, 500);
    } catch {
      readmePreview = 'No README found';
    }

    return {
      hasTests: paths.some((p: string) => p.toLowerCase().includes('test') || p.toLowerCase().includes('spec')),
      hasDocs: paths.some((p: string) => p.includes('docs/') || p.toLowerCase().includes('readme')),
      hasCI: paths.some((p: string) => p.includes('.github/workflows') || p.includes('.circleci') || p.includes('travis.yml')),
      hasTypeScript: paths.some((p: string) => p.endsWith('.ts') || p.endsWith('.tsx')),
      hasLinting: paths.some((p: string) => p.includes('eslint') || p.includes('.prettierrc') || p.includes('tsconfig.json')),
      fileCount: tree.tree.length,
      complexity: tree.tree.length > 100 ? 'high' : tree.tree.length > 30 ? 'medium' : 'low',
      readmePreview
    };
  } catch {
    return null;
  }
};

export const checkMaintainerStatus = async (token: string, username: string, repo: string, owner: string) => {
  const octokit = new Octokit({ auth: token });

  try {
    if (username.toLowerCase() === owner.toLowerCase()) return true;

    const { data: collaborators } = await octokit.rest.repos.listCollaborators({
      owner,
      repo,
      affiliation: 'direct'
    });

    const isMaintainer = collaborators.some((c: any) =>
      c.login === username && (c.permissions.admin || c.permissions.maintain || c.permissions.push)
    );

    return isMaintainer;
  } catch {
    return false;
  }
};

export const detectEducationalContent = (repo: any) => {
  const educationalKeywords = [
    'tutorial', 'guide', 'learning', 'course', 'example', 'sample',
    'clone', 'implementation', 'algorithm', 'interview', 'leetcode',
    'bootcamp', 'practice', 'exercise', 'roadmap', 'notes', 'study',
    'primer', 'cheatsheet', 'reference', 'university', 'curriculum'
  ];

  const productionExclusions = ['framework', 'library', 'engine', 'platform', 'api'];

  const nameAndDesc = `${repo.name} ${repo.description || ''}`.toLowerCase();
  const isEducational = educationalKeywords.some(kw => nameAndDesc.includes(kw));
  const hasProductionSignals = productionExclusions.some(kw => nameAndDesc.includes(kw));

  const totalCommitCount = repo.totalCommits || 0;
  const suspiciousRatio = totalCommitCount > 0 ? (repo.stars / totalCommitCount) : 0;
  const isLikelyCurated = suspiciousRatio > 50;
  const hasReadmeOnly = totalCommitCount < 10;

  return {
    isEducational: isEducational && !hasProductionSignals,
    isLikelyGuide: isEducational && (hasReadmeOnly || isLikelyCurated),
    educationalSignalStrength: isEducational ? 'high' : 'low',
    starsPerCommit: suspiciousRatio
  };
};

// NEW: Enhanced AI Code Detection
export const detectAICodeSignals = (codeContent: string, commits: any[]) => {
  // ═══════════════════════════════════════════════════════════════════════════
  // 1. Explicit AI Tool Mentions in Code (comments, strings, file names)
  // ═══════════════════════════════════════════════════════════════════════════
  const codePatterns = {
    copilot: /github copilot|@copilot|copilot[:\-\s]|(ai|auto)[:\-\s]?generated/gi,
    cursor: /cursor\s?(ai|ide|editor)|cursor[:\-\s]completion|cursor\.sh/gi,
    claude: /claude[:\-\s]?(code|3|opus|sonnet|haiku)|anthropic|using claude/gi,
    chatgpt: /chatgpt|gpt[:\-\s]?4|openai[:\-\s]?(api|chat)|"model":\s*"gpt/gi,
    gemini: /gemini[:\-\s]?(pro|ultra|flash)|google ai studio/gi,
    cline: /cline[:\-\s]|v0\.dev|bolt\.new|lovable\.dev|replit\s?agent/gi,
    aider: /aider|continue\.dev|sourcegraph\s?cody|tabnine/gi,
    generic: /ai[:\-\s]?(assisted|generated|powered|helper)/gi,
  };

  let codeExplicitMarkers = 0;
  for (const pattern of Object.values(codePatterns)) {
    codeExplicitMarkers += (codeContent.match(pattern) || []).length;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 2. Commit Message AI Mentions (critical for detecting Claude Code, etc.)
  // ═══════════════════════════════════════════════════════════════════════════
  const commitPatterns = [
    /claude[:\-\s]?(code)?/i,
    /copilot/i,
    /cursor[:\-\s]?(ai|ide)?/i,
    /chatgpt|gpt[:\-\s]?4/i,
    /gemini/i,
    /with\s?(ai|llm|claude|gpt)/i,
    /ai[:\-\s]?(assisted|generated|help)/i,
    /\[ai\]|\(ai\)/i,
    /co[:\-]?authored[:\-]?by[:\s]*(claude|copilot|cursor|chatgpt|ai)/i,
    /vibe[:\-\s]?coded|vibe\s?check/i,
    /auto[:\-\s]?(generated|completed|commit)/i,
    /🤖|🧠|✨.*ai/i,
  ];

  const commitMessages = commits.map((c: any) => c.message || '').join('\n');
  let commitAIReferences = 0;
  for (const pattern of commitPatterns) {
    commitAIReferences += (commitMessages.match(new RegExp(pattern, 'gi')) || []).length;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 3. Behavioral Patterns (AI-style commits)
  // ═══════════════════════════════════════════════════════════════════════════

  // Large single-file commits (AI often dumps large blocks)
  const largeSingleFileCommits = commits.filter((c: any) =>
    (c.additions || 0) > 300 && (c.changedFilesIfAvailable || 1) === 1
  ).length;

  // Many files changed at once (AI scaffolding)
  const bulkFileCommits = commits.filter((c: any) =>
    (c.changedFilesIfAvailable || 0) > 10 && (c.additions || 0) > 500
  ).length;

  // Commits with generic messages (AI default behavior)
  const genericMessages = commits.filter((c: any) => {
    const msg = (c.message || '').toLowerCase();
    return /^(initial commit|update|fix|wip|changes|refactor)$/i.test(msg.trim()) ||
      msg.length < 8;
  }).length;

  // ═══════════════════════════════════════════════════════════════════════════
  // 4. Code Style Signals (AI tends to over-explain)
  // ═══════════════════════════════════════════════════════════════════════════
  const codeLines = codeContent.split('\n');
  const commentLines = codeLines.filter(line =>
    line.trim().startsWith('//') || line.trim().startsWith('/*') || line.trim().startsWith('*')
  );
  const commentDensity = commentLines.length / Math.max(codeLines.length, 1);
  const hasExcessiveComments = commentDensity > 0.35;

  const verboseJSDoc = (codeContent.match(/\/\*\*[\s\S]{300,}\*\//g) || []).length;
  const explanatoryStyle = (codeContent.match(/\/\/ (here's how|this (function|method|class)|note that|important:|step \d)/gi) || []).length;

  // ═══════════════════════════════════════════════════════════════════════════
  // 5. Calculate Overall AI Likelihood Score
  // ═══════════════════════════════════════════════════════════════════════════
  const aiLikelihoodScore = Math.min(
    // Explicit markers are strong signals
    (codeExplicitMarkers * 25) +
    // Commit messages mentioning AI tools are VERY strong
    (commitAIReferences * 35) +
    // Behavioral patterns
    (largeSingleFileCommits * 8) +
    (bulkFileCommits * 12) +
    (genericMessages > 3 ? 10 : 0) +
    // Code style
    (hasExcessiveComments ? 10 : 0) +
    (verboseJSDoc * 5) +
    (explanatoryStyle * 3),
    100
  );

  return {
    codeExplicitMarkers,
    commitAIReferences,
    largeSingleFileCommits,
    bulkFileCommits,
    genericMessages,
    commentDensity: parseFloat(commentDensity.toFixed(2)),
    hasExcessiveComments,
    verboseJSDoc,
    explanatoryStyle,
    aiLikelihoodScore,
    // Summary for debugging
    detectedTools: [
      codeContent.match(/claude/i) ? 'Claude' : null,
      codeContent.match(/copilot/i) ? 'Copilot' : null,
      codeContent.match(/cursor/i) ? 'Cursor' : null,
      codeContent.match(/chatgpt|gpt-?4/i) ? 'ChatGPT' : null,
      commitMessages.match(/claude/i) ? 'Claude (commit)' : null,
      commitMessages.match(/copilot/i) ? 'Copilot (commit)' : null,
    ].filter(Boolean)
  };
};

export const analyzeContributionDepth = (repo: any) => {
  if (!repo.isFork) return { type: 'original', depth: 'high' };

  const commitCount = repo.totalCommits || 0;

  if (commitCount < 5) return { type: 'fork', depth: 'minimal' };
  if (commitCount < 50) return { type: 'fork', depth: 'moderate' };
  return { type: 'fork', depth: 'major' };
};

export const calculateStarDistribution = (repos: any[]) => {
  const starsArray = repos.map(r => r.stars || 0);
  return {
    total_stars: starsArray.reduce((sum, s) => sum + s, 0),
    highest_single_repo: starsArray.length > 0 ? Math.max(...starsArray) : 0,
    repos_with_1000_plus: repos.filter(r => r.stars >= 1000).length,
    repos_with_500_plus: repos.filter(r => r.stars >= 500).length,
    repos_with_100_plus: repos.filter(r => r.stars >= 100).length,
    average_stars_per_repo: repos.length > 0 ? starsArray.reduce((sum, s) => sum + s, 0) / repos.length : 0
  };
};

export const fetchSmartDiffs = async (token: string, owner: string, repos: any[]) => {
  const octokit = new Octokit({ auth: token });
  const allDiffs: string[] = [];

  for (const repo of repos.slice(0, 5)) {
    const topCommits = [...(repo.commits || [])]
      .sort((a: any, b: any) => {
        const aImpact = (a.additions || 0) + (a.deletions || 0);
        const bImpact = (b.additions || 0) + (b.deletions || 0);
        return bImpact - aImpact;
      })
      .slice(0, 3);

    try {
      for (const commit of topCommits) {
        const { data } = await octokit.rest.repos.getCommit({
          owner,
          repo: repo.name,
          ref: commit.oid
        });

        const files = data.files || [];

        const codeFiles = files
          .filter((f: any) => {
            if (!f.patch) return false;

            const skipPatterns = [
              'package-lock.json', 'yarn.lock', 'Cargo.lock', 'poetry.lock',
              '.min.js', '.bundle.js', 'dist/', 'build/',
              'node_modules/', '.git/', '__pycache__/'
            ];

            if (skipPatterns.some(p => f.filename.includes(p))) return false;

            const codeExtensions = [
              '.ts', '.tsx', '.js', '.jsx', '.py', '.rs', '.go',
              '.java', '.cpp', '.c', '.rb', '.php', '.swift', '.kt'
            ];

            return codeExtensions.some(ext => f.filename.endsWith(ext));
          })
          .slice(0, 5);

        const codeSnippets = codeFiles
          .map((f: any) => {
            const patch = f.patch || '';
            const meaningfulLines = patch
              .split('\n')
              .filter((line: string) => {
                const trimmed = line.trim();
                if (!trimmed.startsWith('+') && !trimmed.startsWith('-')) return false;
                if (trimmed.length < 10) return false;

                const content = trimmed.substring(1).trim();
                return content.length > 5 && !/^[{}()\[\];,]*$/.test(content);
              })
              .slice(0, 30)
              .join('\n');

            return `File: ${f.filename}\n${meaningfulLines}`;
          })
          .join('\n\n');

        if (codeSnippets.trim().length > 50) {
          allDiffs.push(`[${repo.name}] ${commit.message}\n${codeSnippets}`);
        }
      }
    } catch (error) {
      console.warn(`[GitHub] Failed to fetch diffs for ${repo.name}`);
    }
  }

  const result = allDiffs.join('\n\n---\n\n');
  if (!result || result.length < 100) {
    return 'No meaningful code samples available. Analysis based on repository metadata only.';
  }

  return result.length > 10000 ? result.substring(0, 10000) + '\n\n[...truncated for token efficiency]' : result;
};

export const generateTrajectoryNarrative = (trajectory: Record<string, any[]>): string => {
  const entries = Object.entries(trajectory)
    .sort(([a], [b]) => parseInt(a) - parseInt(b))
    .map(([year, repos]) => {
      const langs = [...new Set(repos.map(r => r.language).filter(Boolean))];
      const avgStars = repos.reduce((s, r) => s + (r.stars || 0), 0) / repos.length;
      const topRepo = repos.sort((a, b) => b.stars - a.stars)[0];

      return `${year}: ${langs.slice(0, 3).join('/')} • ${repos.length} projects • ${Math.round(avgStars)} avg stars • Peak: "${topRepo?.name}" (${topRepo?.stars}⭐)`;
    });

  return entries.join('\n');
};

export const calculateReachability = (stats: any) => {
  // 1. Recency Score (50%)
  let recencyScore = 0;
  if (stats.lastPushedAt) {
    const daysSinceLastCommit = Math.floor((Date.now() - new Date(stats.lastPushedAt).getTime()) / (1000 * 60 * 60 * 24));
    if (daysSinceLastCommit < 7) recencyScore = 100;
    else if (daysSinceLastCommit < 30) recencyScore = 80;
    else if (daysSinceLastCommit < 90) recencyScore = 60;
    else if (daysSinceLastCommit < 180) recencyScore = 40;
    else recencyScore = 20;
  }

  // 2. Frequency Score (30%) - Activity Pattern over last 12 weeks
  let frequencyScore = 0;
  if (stats.contributionCalendar?.weeks) {
    const weeks = stats.contributionCalendar.weeks;
    const recentWeeks = weeks.slice(-12); // Last 12 weeks
    const activeWeeks = recentWeeks.filter((w: any) =>
      w.contributionDays.some((d: any) => d.contributionCount > 0)
    ).length;

    frequencyScore = Math.min(100, (activeWeeks / 12) * 100);
  }

  // 3. Engagement Score (20%) - PRs, Issues, Stars, Profile Freshness
  let engagementScore = 0;
  const prScore = Math.min(40, (stats.pullRequests || 0) * 4); // Max 40 if 10+ PRs
  const issueScore = Math.min(20, (stats.issues || 0) * 2);    // Max 20 if 10+ Issues
  const starScore = Math.min(20, (stats.starredRepositories || 0) * 0.2); // Max 20 if 100+ Stars

  // Profile freshness
  let profileScore = 0;
  if (stats.updatedAt) {
    const daysSinceUpdate = Math.floor((Date.now() - new Date(stats.updatedAt).getTime()) / (1000 * 60 * 60 * 24));
    if (daysSinceUpdate < 30) profileScore = 20;
    else if (daysSinceUpdate < 90) profileScore = 10;
  }

  engagementScore = prScore + issueScore + starScore + profileScore;

  const totalScore = (recencyScore * 0.5) + (frequencyScore * 0.3) + (engagementScore * 0.2);

  let signal = '🔴';
  let label = 'LOW REACHABILITY';
  if (totalScore >= 65) {
    signal = '🟢';
    label = 'HIGH REACHABILITY';
  } else if (totalScore >= 35) {
    signal = '🟡';
    label = 'MEDIUM REACHABILITY';
  }

  return {
    score: Math.round(totalScore),
    signal,
    label,
    breakdown: {
      recency: recencyScore,
      frequency: Math.round(frequencyScore),
      engagement: Math.round(engagementScore)
    }
  };
};

export const analyzeGlobalTrajectory = (repos: any[]) => {
  const years: Record<string, any[]> = {};

  repos.forEach(repo => {
    const year = repo.updatedAt ? new Date(repo.updatedAt).getFullYear().toString() : 'Legacy';
    if (!years[year]) years[year] = [];

    years[year].push({
      name: repo.name,
      url: repo.url,
      description: repo.description,
      language: repo.language,
      stars: repo.stars,
      forks: repo.forks,
      commits: (repo.commits || []).map((c: any) => ({
        date: c.committedDate,
        message: c.message,
        impact: (c.additions || 0) + (c.deletions || 0),
        files_changed: c.changedFilesIfAvailable
      }))
    });
  });

  return years;
};

export const findTopRepos = async (token: string, username: string) => {
  const octokit = new Octokit({ auth: token });

  try {
    const { data: rateLimit } = await octokit.rest.rateLimit.get();
    if (rateLimit.resources.core.remaining < 100) {
      console.warn(`[GitHub] Rate limit low: ${rateLimit.resources.core.remaining}`);
    }
  } catch (e) { }

  const query = `
    query($username: String!) {
      user(login: $username) {
        repositories(first: 100, orderBy: {field: STARGAZERS, direction: DESC}, privacy: PUBLIC) {
          nodes {
            name
            url
            isFork
            description
            updatedAt
            pushedAt
            primaryLanguage { name }
            stargazerCount
            forkCount
            defaultBranchRef {
              target {
                ... on Commit {
                  history(first: 20) {
                    totalCount
                    nodes {
                      oid
                      message
                      committedDate
                      additions
                      deletions
                      changedFilesIfAvailable
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  `;

  try {
    const response: any = await octokit.graphql(query, { username });
    if (!response.user) return [];

    const allRepos = response.user.repositories.nodes;
    const selected = new Map<string, any>();

    const addRepos = (list: any[]) => {
      list.forEach(repo => {
        if (repo && !selected.has(repo.name)) {
          selected.set(repo.name, repo);
        }
      });
    };

    const allTimeTop = [...allRepos].sort((a, b) => b.stargazerCount - a.stargazerCount).slice(0, 10);
    console.log(`[GitHub] DEBUG - Total repos fetched: ${allRepos.length}`);
    console.log(`[GitHub] DEBUG - Top 5 repos by stars:`, allTimeTop.slice(0, 5).map(r => `${r.name}: ${r.stargazerCount}⭐`));
    addRepos(allTimeTop);

    const currentYear = new Date().getFullYear();
    const years = [currentYear, currentYear - 1, currentYear - 2, currentYear - 3, currentYear - 4];

    years.forEach(year => {
      const yearPool = allRepos.filter((r: any) => new Date(r.updatedAt).getFullYear() === year);
      if (yearPool.length === 0) return;

      const yrStars = [...yearPool].sort((a, b) => b.stargazerCount - a.stargazerCount).slice(0, 3);
      const yrOriginals = yearPool.filter((r: any) => !r.isFork).slice(0, 3);
      addRepos([...yrStars, ...yrOriginals]);
    });

    if (selected.size === 0) {
      addRepos([...allRepos].slice(0, 10));
    }

    const sortedSelection = Array.from(selected.values()).sort((a, b) => b.stargazerCount - a.stargazerCount);

    return sortedSelection.map((repo: any) => ({
      name: repo.name,
      url: repo.url,
      description: repo.description,
      language: repo.primaryLanguage?.name,
      stars: repo.stargazerCount,
      forks: repo.forkCount,
      updatedAt: repo.updatedAt,
      pushedAt: repo.pushedAt,
      isFork: repo.isFork,
      isMaintainer: false, // Will be updated in analyzeGitHubProfile
      totalCommits: repo.defaultBranchRef?.target?.history?.totalCount || 0,
      commits: repo.defaultBranchRef?.target?.history?.nodes || []
    }));
  } catch (error) {
    console.error('[GitHub] findTopRepos failed:', error);
    return [];
  }
};

export const analyzeGitHubProfile = async (token: string, username: string) => {
  console.log(`[GitHub] Starting comprehensive analysis for ${username}`);
  const startTime = Date.now();
  const octokit = new Octokit({ auth: token });

  // Phase 1: Fetch user stats and repos in parallel
  const [userStats, topRepos] = await Promise.all([
    fetchUserStats(token, username).catch(() => null),
    findTopRepos(token, username)
  ]);
  console.log(`[GitHub] Phase 1 (stats+repos): ${Date.now() - startTime}ms`);




  const stats = userStats || {
    totalStars: 0,
    totalRepos: 0,
    totalCommits: 0,
    externalContributions: 0,
    last90DaysCommits: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    name: '',
    email: null,
    pullRequests: 0,
    issues: 0,
    starredRepositories: 0,
    contributionCalendar: null,
    languages: [],
    forkRatio: 0,
    lastPushedAt: null,
    lastActive: null
  };

  // Sync operations (no API calls)
  topRepos.forEach((repo: any) => {
    repo.educationalMeta = detectEducationalContent(repo);
    repo.contribution = analyzeContributionDepth(repo);
  });

  // Phase 2: Run ALL API-heavy operations in parallel
  const phase2Start = Date.now();
  const [qualitySignals, codeSamples, ...maintainerResults] = await Promise.all([
    // Quality signals for top 5 repos
    Promise.all(topRepos.slice(0, 5).map(r => fetchCodeQualitySignals(token, username, r.name))),
    // Smart diffs
    fetchSmartDiffs(token, username, topRepos),
    // Maintainer checks only for 1K+ star repos
    ...topRepos.filter((r: any) => r.stars >= 1000).map((repo: any) =>
      checkMaintainerStatus(token, username, repo.name, username).then(isMaintainer => ({ repo: repo.name, isMaintainer }))
    )
  ]);
  console.log(`[GitHub] Phase 2 (quality+diffs+maintainer): ${Date.now() - phase2Start}ms`);

  // Apply maintainer results
  maintainerResults.forEach((result: any) => {
    const repo = topRepos.find((r: any) => r.name === result.repo);
    if (repo) repo.isMaintainer = result.isMaintainer;
  });

  // AI Code Analysis (sync, uses already-fetched codeSamples)
  const aiCodeAnalysis = topRepos.slice(0, 5).map((repo: any) => ({
    repo: repo.name,
    signals: detectAICodeSignals(codeSamples, repo.commits || [])
  }));

  const avgAILikelihood = aiCodeAnalysis.reduce((sum, r) =>
    sum + r.signals.aiLikelihoodScore, 0
  ) / Math.max(aiCodeAnalysis.length, 1);

  const distribution = calculateStarDistribution(topRepos);
  // Ensure we use the most accurate star count (GraphQL repositories vs search count)
  const totalStars = Math.max(stats.totalStars || 0, distribution.total_stars || 0);
  stats.totalStars = totalStars;
  distribution.total_stars = totalStars;
  distribution.highest_single_repo = Math.max(distribution.highest_single_repo, topRepos[0]?.stars || 0);

  const trajectoryData = analyzeGlobalTrajectory(topRepos);
  const reachability = calculateReachability(stats);

  console.log(`[GitHub] Total analysis time: ${Date.now() - startTime}ms`);

  const finalLastActive = stats.lastActive || stats.lastPushedAt || (topRepos.length > 0 ? topRepos[0].pushedAt : null) || stats.updatedAt;

  return {
    userStats: stats,
    email: stats.email,
    reachability,
    lastActive: finalLastActive,
    topRepos,
    qualitySignals: qualitySignals.filter(Boolean),
    starDistribution: distribution,
    trajectory: trajectoryData,
    trajectoryNarrative: generateTrajectoryNarrative(trajectoryData),
    codeSamples,
    aiCodeAnalysis,
    avgAILikelihood
  };
};

// Extract languages/skills from JD text using keyword matching
const extractLanguagesFromJD = (jd: string): string[] => {
  if (!jd) return [];

  const jdLower = jd.toLowerCase();
  const languageMap: { [key: string]: string[] } = {
    'Python': ['python', 'django', 'flask', 'fastapi', 'pandas', 'numpy'],
    'TypeScript': ['typescript', 'ts'],
    'JavaScript': ['javascript', 'js', 'node.js', 'nodejs', 'node', 'express'],
    'React': ['react', 'react.js', 'reactjs', 'react native', 'next.js', 'nextjs'],
    'Go': ['golang', 'go'],
    'Rust': ['rust'],
    'Java': ['java', 'spring', 'springboot'],
    'C++': ['c++', 'cpp'],
    'Ruby': ['ruby', 'rails', 'ruby on rails'],
    'PHP': ['php', 'laravel'],
    'Swift': ['swift', 'ios'],
    'Kotlin': ['kotlin', 'android']
  };

  const detected: string[] = [];
  for (const [language, keywords] of Object.entries(languageMap)) {
    if (keywords.some(kw => jdLower.includes(kw))) {
      detected.push(language);
    }
  }

  console.log(`[JD Parser] Detected languages: ${detected.join(', ')}`);
  return detected;
};

export const searchCandidates = async (token: string, criteria: any) => {
  const octokit = new Octokit({ auth: token });
  let { languages, experience, jobTitle, location, jd } = criteria;

  console.log(`[Chekklist Search] RAW INPUT:`, { languages, experience, jobTitle, location, jd: jd ? `${jd.substring(0, 100)}...` : 'none' });

  // Auto-extract languages from JD if not provided
  if ((!languages || languages.length === 0) && jd) {
    const detectedLangs = extractLanguagesFromJD(jd);
    if (detectedLangs.length > 0) {
      languages = detectedLangs;
      console.log(`[Chekklist Search] ✅ Auto-detected languages from JD: ${languages.join(', ')}`);
    } else {
      console.log(`[Chekklist Search] ⚠️ JD provided but no languages detected`);
    }
  } else if (languages && languages.length > 0) {
    console.log(`[Chekklist Search] ✅ Using manually selected languages: ${languages.join(', ')}`);
  } else {
    console.log(`[Chekklist Search] ⚠️ No languages provided and no JD to extract from`);
  }

  console.log(`[Chekklist Search] FINAL SEARCH CRITERIA:`, { languages, experience, jobTitle, location });

  // Helper to run a search query using REST API (more permissive than GraphQL)
  const runSearch = async (q: string, description: string): Promise<any[]> => {
    console.log(`[Chekklist Search] Strategy: ${description}`);
    console.log(`[Chekklist Search] Query: ${q}`);

    try {
      // Use REST API instead of GraphQL - more permissive for broad queries
      const response = await octokit.rest.search.users({
        q,
        per_page: 100,
        sort: 'followers',
        order: 'desc'
      });

      console.log(`[Chekklist Search] Found ${response.data.items.length} users`);

      // Fetch detailed data for each user (in parallel)
      const detailedUsers = await Promise.all(
        response.data.items.slice(0, 30).map(async (user: any) => { // Limit to 30 per query to avoid rate limits
          try {
            // Fetch user details with GraphQL for rich data
            const detailQuery = `
              query($login: String!) {
                user(login: $login) {
                  login
                  name
                  email
                  avatarUrl
                  bio
                  location
                  url
                  updatedAt
                  followers { totalCount }
                  pullRequests(first: 1) { totalCount }
                  issues(first: 1) { totalCount }
                  starredRepositories(first: 1) { totalCount }
                  contributionsCollection {
                    totalCommitContributions
                    contributionCalendar {
                      totalContributions
                      weeks {
                        contributionDays {
                          contributionCount
                        }
                      }
                    }
                  }
                  repositories(first: 5, orderBy: {field: PUSHED_AT, direction: DESC}, privacy: PUBLIC) {
                    nodes {
                      name
                      stargazerCount
                      pushedAt
                      primaryLanguage { name }
                      description
                    }
                  }
                }
              }
            `;

            const details: any = await octokit.graphql(detailQuery, { login: user.login });
            return details.user;
          } catch (err) {
            console.error(`[Chekklist Search] Failed to fetch details for ${user.login}:`, err);
            return null;
          }
        })
      );

      return detailedUsers.filter((u: any) => u !== null);
    } catch (error: any) {
      console.error(`[Chekklist Search] Query failed:`, error.message);
      return [];
    }
  };

  // Strategy 1: Most specific - language + recent activity + followers
  // Using followers:>10 to find established developers
  let results: any[] = [];

  // Build language filter - use first language only for broader results
  const primaryLang = languages && languages.length > 0 ? languages[0] : 'TypeScript';

  // Calculate date filter - 6 months is more reasonable
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
  const dateStr = sixMonthsAgo.toISOString().split('T')[0];

  // Build location filter if provided
  const locationFilter = location ? ` location:"${location}"` : '';

  // Helper to merge unique results
  const mergeResults = (newResults: any[]) => {
    const existingLogins = new Set(results.map(r => r.login));
    newResults.forEach(r => {
      if (!existingLogins.has(r.login)) {
        results.push(r);
      }
    });
  };

  // Strategy 1: Language + Recent activity + Medium followers + Location (LOWERED from 50 to 20)
  const q1 = `type:user language:${primaryLang} pushed:>${dateStr} followers:>20${locationFilter}`;
  results = await runSearch(q1, "Primary language + recent + followers>20" + (location ? ` + ${location}` : ''));

  // Strategy 2: Language + Recent activity + Low followers (LOWERED from 20 to 5)
  const q2 = `type:user language:${primaryLang} pushed:>${dateStr} followers:>5`;
  mergeResults(await runSearch(q2, "Primary language + recent + followers>5"));

  // Strategy 3: Language + Good repos (LOWERED threshold)
  if (languages && languages.length > 0) {
    const q3 = `type:user language:${primaryLang} repos:>10 followers:>3`;
    mergeResults(await runSearch(q3, "Primary language + repos>10 + followers>3"));
  }

  // Strategy 4: Second language if provided (LOWERED from 20 to 5)
  if (languages && languages.length > 1) {
    const q4 = `type:user language:${languages[1]} pushed:>${dateStr} followers:>5`;
    mergeResults(await runSearch(q4, `${languages[1]} + recent + followers>5`));
  }

  // Strategy 5: Third language if provided
  if (languages && languages.length > 2) {
    const q5 = `type:user language:${languages[2]} pushed:>${dateStr} repos:>5`;
    mergeResults(await runSearch(q5, `${languages[2]} + recent + repos>5`));
  }

  // Strategy 6: Improved job title/company extraction
  if (jobTitle) {
    // Extract company name from brackets [CompanyName]
    const companyMatch = jobTitle.match(/\[([^\]]+)\]/);
    const company = companyMatch ? companyMatch[1] : '';

    // Remove company from job title for better keyword extraction
    const titleWithoutCompany = jobTitle.replace(/\[.*?\]/g, '').trim();

    // Better keyword extraction - focus on technical roles
    const roleKeywords = titleWithoutCompany
      .toLowerCase()
      .split(/\s+/)
      .filter((w: string) => {
        // Keep longer technical words
        if (w.length <= 3) return false;
        // Filter out common non-technical words
        const stopWords = ['the', 'and', 'for', 'with', 'this', 'that', 'from'];
        return !stopWords.includes(w);
      })
      .slice(0, 3) // Take top 3 keywords
      .join(' ');

    if (roleKeywords) {
      // Don't require followers for job title search
      const q6 = `type:user ${roleKeywords} repos:>5`;
      mergeResults(await runSearch(q6, `Job keywords: "${roleKeywords}"`));
    }

    // If company name exists, search for it
    if (company && company.toLowerCase() !== 'rilla') {
      const q7 = `type:user company:"${company}" repos:>5`;
      mergeResults(await runSearch(q7, `Company: "${company}"`));
    }
  }

  // Strategy 7: Popular devs in primary lang (keep high threshold for quality)
  const q8 = `type:user language:${primaryLang} followers:>50`;
  mergeResults(await runSearch(q8, `${primaryLang} + followers>50`));

  console.log(`[Chekklist Search] Total raw candidates: ${results.length}`);

  // FALLBACK STRATEGIES: If we have very few results, try broader searches
  if (results.length < 50) {
    console.log(`[Chekklist Search] Low result count (${results.length}), trying fallback strategies...`);

    // Fallback 1: Remove date filter, just language + repos
    if (languages && languages.length > 0) {
      const fallback1 = `type:user language:${primaryLang} repos:>5`;
      mergeResults(await runSearch(fallback1, `FALLBACK: ${primaryLang} + repos>5 (no date filter)`));
    }

    // Fallback 2: Try all languages without strict filters
    if (languages && languages.length > 1) {
      for (let i = 1; i < Math.min(languages.length, 3); i++) {
        const fallback2 = `type:user language:${languages[i]} repos:>5`;
        mergeResults(await runSearch(fallback2, `FALLBACK: ${languages[i]} + repos>5`));
      }
    }

    // Fallback 3: If still low, try without language filter but with location
    if (results.length < 30 && location) {
      const fallback3 = `type:user location:"${location}" repos:>10`;
      mergeResults(await runSearch(fallback3, `FALLBACK: location only + repos>10`));
    }

    // Fallback 4: Last resort - just language, no other filters
    if (results.length < 20 && primaryLang) {
      const fallback4 = `type:user language:${primaryLang}`;
      const fallbackResults = await runSearch(fallback4, `FALLBACK: ${primaryLang} only (no filters)`);
      // Limit fallback results to prevent flooding with low-quality matches
      mergeResults(fallbackResults.slice(0, 100));
    }

    console.log(`[Chekklist Search] After fallbacks: ${results.length} candidates`);
  }

  // Sort by combined signal: followers + stars
  results = results
    .map(user => ({
      ...user,
      totalStars: (user.repositories?.nodes || []).reduce((sum: number, r: any) => sum + (r?.stargazerCount || 0), 0),
      followerCount: user.followers?.totalCount || 0,
      hasRecentRepos: (user.repositories?.nodes || []).length > 0
    }))
    // Filter out low-quality candidates that will likely be GHOSTs (RELAXED filter)
    .filter(user => {
      // Must have public repos
      if (!user.hasRecentRepos) return false;
      // Relaxed: Allow users with at least 1 follower OR any stars
      if (user.totalStars === 0 && user.followerCount < 1) return false;
      return true;
    })
    .sort((a, b) => (b.followerCount + b.totalStars) - (a.followerCount + a.totalStars))
    .slice(0, 500);  // Return top 500 for analysis

  console.log(`[Chekklist Search] Final results after quality filter: ${results.length} candidates`);

  return results;
};

// Search for a GitHub user by email using GitHub's Search API
export const searchUserByEmail = async (token: string, email: string): Promise<string | null> => {
  const octokit = new Octokit({ auth: token });

  try {
    // GitHub's user search API supports searching by email
    const { data } = await octokit.rest.search.users({
      q: `${email} in:email`,
      per_page: 1
    });

    if (data.items && data.items.length > 0) {
      console.log(`[GitHub] Found user ${data.items[0].login} for email ${email}`);
      return data.items[0].login;
    }

    // Fallback: Try searching commits with that email
    const { data: commitData } = await octokit.rest.search.commits({
      q: `author-email:${email}`,
      per_page: 1
    });

    if (commitData.items && commitData.items.length > 0 && commitData.items[0].author) {
      console.log(`[GitHub] Found user ${commitData.items[0].author.login} from commit email ${email}`);
      return commitData.items[0].author.login;
    }

    console.log(`[GitHub] No user found for email ${email}`);
    return null;
  } catch (error) {
    console.error(`[GitHub] Email search failed for ${email}:`, error);
    return null;
  }
};

/**
 * Resolve a GitHub username to an email address using multiple strategies:
 * 1. Check public profile email (already fetched in userStats)
 * 2. Fetch user's public events and extract email from push events
 * 3. Fetch a commit patch to extract author email (last resort)
 */
export const resolveGitHubEmail = async (token: string, username: string): Promise<string | null> => {
  const octokit = new Octokit({ auth: token });

  console.log(`[GitHub] Resolving email for ${username}...`);

  // Strategy 1: Check GraphQL public email FIRST (most reliable - user explicitly set this)
  try {
    const query = `
      query($login: String!) {
        user(login: $login) {
          email
        }
      }
    `;
    const response: any = await octokit.graphql(query, { login: username });
    if (response.user?.email) {
      console.log(`[GitHub] Found PUBLIC email via GraphQL: ${response.user.email}`);
      return response.user.email;
    }
  } catch (error) {
    console.warn(`[GitHub] GraphQL email query failed for ${username}:`, error);
  }

  // Strategy 2: Try events API (gets commit emails from most recent activity)
  try {
    const eventsUrl = `https://api.github.com/users/${username}/events/public`;
    const eventsResponse = await fetch(eventsUrl, {
      headers: {
        'Accept': 'application/vnd.github.v3+json',
        'Authorization': `token ${token}`,
        'User-Agent': 'Vibechekk'
      }
    });

    if (eventsResponse.ok) {
      const events = await eventsResponse.json();

      // Sort events by created_at descending (most recent first)
      const sortedEvents = [...events].sort((a: any, b: any) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      // Look for the most recent PushEvent which contains commit author emails
      for (const event of sortedEvents) {
        if (event.type === 'PushEvent' && event.payload?.commits) {
          // Get the most recent commit in this push
          const commits = [...event.payload.commits].reverse(); // Most recent last in array
          for (const commit of commits) {
            if (commit.author?.email) {
              const email = commit.author.email;
              // Skip noreply emails
              if (!email.includes('noreply.github.com') && !email.includes('@users.noreply')) {
                console.log(`[GitHub] Found email via events API (fallback): ${email}`);
                return email;
              }
            }
          }
        }
      }
    }
  } catch (error) {
    console.warn(`[GitHub] Events API failed for ${username}:`, error);
  }

  // Strategy 2: Get a recent commit and fetch its .patch file
  try {
    const { data: repos } = await octokit.rest.repos.listForUser({
      username,
      sort: 'pushed',
      per_page: 5
    });

    for (const repo of repos) {
      if (repo.fork) continue; // Skip forks

      try {
        const { data: commits } = await octokit.rest.repos.listCommits({
          owner: username,
          repo: repo.name,
          author: username,
          per_page: 1
        });

        if (commits.length > 0) {
          const commitSha = commits[0].sha;

          // Fetch the patch format
          const patchUrl = `https://github.com/${username}/${repo.name}/commit/${commitSha}.patch`;
          const patchResponse = await fetch(patchUrl, {
            headers: { 'User-Agent': 'Vibechekk' }
          });

          if (patchResponse.ok) {
            const patchText = await patchResponse.text();

            // Extract email from "From: Name <email>" line in patch
            const fromMatch = patchText.match(/From:\s*(?:[^<]*<)?([^>@\s]+@[^>\s]+)/i);
            if (fromMatch && fromMatch[1]) {
              const email = fromMatch[1];
              // Skip noreply emails
              if (!email.includes('noreply.github.com') && !email.includes('@users.noreply')) {
                console.log(`[GitHub] Found email via commit patch: ${email}`);
                return email;
              }
            }
          }
        }
      } catch (e) {
        // Continue to next repo
      }
    }
  } catch (error) {
    console.warn(`[GitHub] Commit patch strategy failed for ${username}:`, error);
  }

  // GraphQL already checked as Strategy 1, no need to retry

  console.log(`[GitHub] Could not resolve email for ${username}`);
  return null;
};
