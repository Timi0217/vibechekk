import { Octokit } from 'octokit';

export const fetchGitHubData = async (token: string, owner: string, repo: string) => {
  const octokit = new Octokit({ auth: token });

  // GraphQL query to get commit history and file samples for the last 12 months
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
    return response.repository.defaultBranchRef.target.history.nodes;
  } catch (error) {
    console.error('Error fetching GitHub data:', error);
    throw error;
  }
};

export const fetchRecentDiffs = async (token: string, owner: string, repo: string, commits: any[]) => {
  const octokit = new Octokit({ auth: token });
  const recentCommits = commits.slice(0, 5); // Analyze last 5 commits for depth

  try {
    const diffs = await Promise.all(recentCommits.map(async (commit) => {
      const { data } = await octokit.rest.repos.getCommit({
        owner,
        repo,
        ref: commit.oid,
        headers: {
          accept: 'application/vnd.github.v3.diff'
        }
      });
      // Truncate diff if it's too large (over 2000 chars)
      const diffStr = typeof data === 'string' ? data : '';
      return `Commit: ${commit.message}\n${diffStr.slice(0, 2000)}${diffStr.length > 2000 ? '\n... (truncated)' : ''}`;
    }));

    return diffs.join('\n\n---\n\n');
  } catch (error) {
    console.error('Error fetching diffs:', error);
    return 'Could not fetch code diffs, falling back to metadata only.';
  }
};

export const analyzeTrajectory = (commits: any[]) => {
  // Logic to calculate monthly peak diffs and engineering taste indicators
  // For now, returning a summary for the AI prompt
  const summary = commits.map(c => ({
    date: c.committedDate,
    message: c.message,
    diff: c.additions + c.deletions,
    files: c.changedFilesIfAvailable
  }));

  return summary;
};
