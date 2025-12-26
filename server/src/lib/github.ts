import { Octokit } from 'octokit';

export const fetchGitHubData = async (token: string, owner: string, repo: string) => {
  const octokit = new Octokit({ auth: token });

  const query = `
    query($owner: String!, $repo: String!) {
      repository(owner: $owner, name: $repo) {
        defaultBranchRef {
          target {
            ... on Commit {
              history(first: 100) {
                nodes {
                  oid
                  message
                  committedDate
                  additions
                  deletions
                  changedFilesIfAvailable
                  author {
                    name
                    email
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
    const response: any = await octokit.graphql(query, { owner, repo });
    return response?.repository?.defaultBranchRef?.target?.history?.nodes || [];
  } catch (error) {
    console.error('Error fetching GitHub data:', error);
    throw error;
  }
};

export const fetchMultiRepoDiffs = async (token: string, owner: string, repos: any[]) => {
  const octokit = new Octokit({ auth: token });
  const allDiffs: string[] = [];

  for (const repo of repos.slice(0, 3)) { // Only top 3 for tokens/speed
    const recentCommits = repo.commits.slice(0, 3);
    try {
      const diffs = await Promise.all(recentCommits.map(async (commit: any) => {
        const { data } = await octokit.rest.repos.getCommit({
          owner,
          repo: repo.name,
          ref: commit.oid,
          headers: { accept: 'application/vnd.github.v3.diff' }
        });
        const diffStr = typeof data === 'string' ? data : '';
        return `[Repo: ${repo.name}] Commit: ${commit.message}\n${diffStr.slice(0, 1500)}${diffStr.length > 1500 ? '\n... (truncated)' : ''}`;
      }));
      allDiffs.push(diffs.join('\n\n'));
    } catch (error) {
      console.warn(`[GitHub] Failed to fetch diffs for ${repo.name}`);
    }
  }

  return allDiffs.join('\n\n---\n\n') || 'No code diffs available.';
};

export const analyzeGlobalTrajectory = (repos: any[]) => {
  return repos.map(repo => ({
    name: repo.name,
    url: repo.url,
    description: repo.description,
    language: repo.language,
    stars: repo.stars,
    commits: repo.commits.map((c: any) => ({
      date: c.committedDate,
      message: c.message,
      diff: (c.additions || 0) + (c.deletions || 0),
      files: c.changedFilesIfAvailable
    }))
  }));
};

export const findTopRepos = async (token: string, username: string) => {
  const octokit = new Octokit({ auth: token });
  const query = `
    query($username: String!) {
      user(login: $username) {
        repositories(first: 5, orderBy: {field: UPDATED_AT, direction: DESC}, privacy: PUBLIC) {
          nodes {
            name
            url
            description
            primaryLanguage { name }
            stargazerCount
            forkCount
            defaultBranchRef {
              target {
                ... on Commit {
                  history(first: 20) {
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

    return response.user.repositories.nodes.map((repo: any) => ({
      name: repo.name,
      url: repo.url,
      description: repo.description,
      language: repo.primaryLanguage?.name,
      stars: repo.stargazerCount,
      forks: repo.forkCount,
      commits: repo.defaultBranchRef?.target?.history?.nodes || []
    }));
  } catch (error) {
    console.error('Error finding top repos:', error);
    return [];
  }
};
