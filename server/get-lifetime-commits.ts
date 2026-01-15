import { Octokit } from 'octokit';
import dotenv from 'dotenv';

dotenv.config();

const octokit = new Octokit({ auth: process.env.GITHUB_API_TOKEN });

async function getLifetimeCommits(username: string): Promise<number> {
  // First, get account creation date
  const userQuery = `
    query($username: String!) {
      user(login: $username) {
        createdAt
      }
    }
  `;

  const userRes: any = await octokit.graphql(userQuery, { username });
  const createdAt = new Date(userRes.user.createdAt);
  const now = new Date();

  console.log(`Account created: ${createdAt.toISOString()}`);
  console.log(`Fetching commits year by year...`);

  let totalCommits = 0;
  const contributionsQuery = `
    query($username: String!, $from: DateTime!, $to: DateTime!) {
      user(login: $username) {
        contributionsCollection(from: $from, to: $to) {
          totalCommitContributions
        }
      }
    }
  `;

  // Query year by year
  let currentDate = new Date(createdAt);
  let queryCount = 0;

  while (currentDate < now) {
    const yearEnd = new Date(currentDate);
    yearEnd.setFullYear(yearEnd.getFullYear() + 1);

    // Don't go past current date
    const endDate = yearEnd > now ? now : yearEnd;

    queryCount++;
    console.log(`Query ${queryCount}: ${currentDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}`);

    try {
      const res: any = await octokit.graphql(contributionsQuery, {
        username,
        from: currentDate.toISOString(),
        to: endDate.toISOString()
      });

      const commits = res.user.contributionsCollection.totalCommitContributions;
      console.log(`  → ${commits} commits`);
      totalCommits += commits;

    } catch (error: any) {
      console.error(`  → Error: ${error.message}`);
    }

    currentDate = yearEnd;
  }

  console.log(`\n✅ Total lifetime commits: ${totalCommits}`);
  return totalCommits;
}

getLifetimeCommits('elvniv').catch(console.error);
