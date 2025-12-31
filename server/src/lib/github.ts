import { Octokit } from 'octokit';

export const fetchUserStats = async (token: string, username: string) => {
  const octokit = new Octokit({ auth: token });

  // Calculate date for 90 days ago
  const last90Days = new Date();
  last90Days.setDate(last90Days.getDate() - 90);

  const query = `
    query($username: String!, $from: DateTime!) {
      user(login: $username) {
        name
        createdAt
        contributionsCollection {
          totalCommitContributions
          totalRepositoriesWithContributedCommits
          restrictedContributionsCount
        }
        recentActivity: contributionsCollection(from: $from) {
          totalCommitContributions
          restrictedContributionsCount
        }
        repositories(first: 100, privacy: PUBLIC, orderBy: {field: STARGAZERS, direction: DESC}) {
          totalCount
          nodes {
            stargazerCount
            isFork
            primaryLanguage { name }
          }
        }
      }
    }
  `;

  try {
    const response: any = await octokit.graphql(query, {
      username,
      from: last90Days.toISOString()
    });
    if (!response.user) return null;

    const repos = response.user.repositories.nodes;

    return {
      totalStars: repos.reduce((sum: number, r: any) => sum + r.stargazerCount, 0),
      totalRepos: response.user.repositories.totalCount,
      totalCommits: response.user.contributionsCollection.totalCommitContributions,
      externalContributions: response.user.contributionsCollection.totalRepositoriesWithContributedCommits,
      last90DaysCommits: response.user.recentActivity.totalCommitContributions,
      createdAt: response.user.createdAt,
      name: response.user.name,
      languages: [...new Set(repos.map((r: any) => r.primaryLanguage?.name).filter(Boolean))],
      forkRatio: repos.length > 0 ? repos.filter((r: any) => r.isFork).length / repos.length : 0
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

  // FALLBACK: If GraphQL didn't return high-star repos, try REST API
  let peakStars = topRepos[0]?.stars || 0;
  if (peakStars < 1000) {
    console.log(`[GitHub] Low stars detected (${peakStars}), trying REST API fallback...`);
    try {
      const { data: restRepos } = await octokit.rest.repos.listForUser({
        username,
        sort: 'updated',
        per_page: 100
      });

      const sortedRestRepos = restRepos
        .filter((r: any) => !r.fork)
        .sort((a: any, b: any) => (b.stargazers_count || 0) - (a.stargazers_count || 0));

      if (sortedRestRepos.length > 0 && (sortedRestRepos[0].stargazers_count || 0) > peakStars) {
        peakStars = sortedRestRepos[0].stargazers_count || 0;
        console.log(`[GitHub] REST API found higher stars: ${sortedRestRepos[0].name} (${peakStars}⭐)`);

        // Merge top REST repos into our data
        sortedRestRepos.slice(0, 5).forEach((repo: any) => {
          if (!topRepos.find((r: any) => r.name === repo.name)) {
            topRepos.unshift({
              name: repo.name,
              url: repo.html_url,
              description: repo.description,
              language: repo.language,
              stars: repo.stargazers_count,
              forks: repo.forks_count,
              updatedAt: repo.updated_at,
              isFork: repo.fork,
              isMaintainer: false,
              totalCommits: 0,
              commits: []
            });
          }
        });

        // Re-sort by stars
        topRepos.sort((a: any, b: any) => (b.stars || 0) - (a.stars || 0));
      }
    } catch (e) {
      console.log(`[GitHub] REST fallback failed:`, e);
    }
  }

  const stats = userStats || {
    totalStars: 0,
    totalRepos: 0,
    totalCommits: 0,
    externalContributions: 0,
    last90DaysCommits: 0,
    createdAt: new Date().toISOString(),
    name: '',
    languages: [],
    forkRatio: 0
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
  distribution.total_stars = stats.totalStars || distribution.total_stars;
  distribution.highest_single_repo = Math.max(distribution.highest_single_repo, topRepos[0]?.stars || 0);

  const trajectoryData = analyzeGlobalTrajectory(topRepos);

  console.log(`[GitHub] Total analysis time: ${Date.now() - startTime}ms`);

  return {
    userStats: stats,
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

export const searchCandidates = async (token: string, criteria: any) => {
  const octokit = new Octokit({ auth: token });
  const { languages, experience, jobTitle } = criteria;

  // Calculate date filter for recent activity
  const twoMonthsAgo = new Date();
  twoMonthsAgo.setMonth(twoMonthsAgo.getMonth() - 2);
  const dateStr = twoMonthsAgo.toISOString().split('T')[0];

  // Build language filter - at least one language required for meaningful results
  const langList = languages && languages.length > 0 ? languages : ['JavaScript', 'TypeScript', 'Python'];
  const langQuery = langList.map((l: string) => `language:${l}`).join(' ');

  // Base query: Active users with language expertise
  // GitHub user search is limited - we search by:
  // - type:user (only users, not orgs)
  // - pushed:>DATE (recently active)
  // - language:X (works with repos they own)
  let q = `type:user pushed:>${dateStr} ${langQuery}`;

  // If job title contains keywords, try to find them in bio
  // Note: GitHub search for users is very limited - "in:bio" doesn't work well
  // The best we can do is search for language + activity, then let DeepSeek rank by JD
  if (jobTitle) {
    // Extract meaningful keywords from job title (skip common words)
    const keywords = jobTitle
      .toLowerCase()
      .replace(/senior|junior|lead|staff|principal|engineer|developer|intern/gi, '')
      .trim();

    if (keywords.length > 2) {
      // Add keyword to search (GitHub will try to match in name/bio/readme)
      q += ` ${keywords}`;
    }
  }

  console.log(`[GitHub Search] Query: ${q}`);

  const query = `
    query($q: String!) {
      search(query: $q, type: USER, first: 50) {
        userCount
        nodes {
          ... on User {
            login
            name
            avatarUrl
            bio
            location
            url
            repositories(first: 5, orderBy: {field: STARGAZERS, direction: DESC}, privacy: PUBLIC) {
              nodes {
                name
                stargazerCount
                primaryLanguage { name }
                description
              }
            }
          }
        }
      }
    }
  `;

  try {
    const response: any = await octokit.graphql(query, { q });
    return response.search.nodes;
  } catch (error) {
    console.error('[GitHub] Search failed:', error);
    return [];
  }
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
