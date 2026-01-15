import { Octokit } from 'octokit';
import dotenv from 'dotenv';

dotenv.config();

const octokit = new Octokit({ auth: process.env.GITHUB_API_TOKEN });

async function testContributions() {
  const username = 'elvniv';

  // Test 1: No date range (default - last year)
  console.log('\n=== Test 1: Default (no date range) ===');
  const query1 = `
    query($username: String!) {
      user(login: $username) {
        name
        createdAt
        contributionsCollection {
          totalCommitContributions
          restrictedContributionsCount
        }
      }
    }
  `;
  const res1: any = await octokit.graphql(query1, { username });
  console.log('Created:', res1.user.createdAt);
  console.log('Commits:', res1.user.contributionsCollection.totalCommitContributions);
  console.log('Restricted:', res1.user.contributionsCollection.restrictedContributionsCount);

  // Test 2: From account creation date
  console.log('\n=== Test 2: From account creation date ===');
  const query2 = `
    query($username: String!, $from: DateTime!) {
      user(login: $username) {
        contributionsCollection(from: $from) {
          totalCommitContributions
          restrictedContributionsCount
        }
      }
    }
  `;
  const res2: any = await octokit.graphql(query2, {
    username,
    from: res1.user.createdAt
  });
  console.log('Commits:', res2.user.contributionsCollection.totalCommitContributions);
  console.log('Restricted:', res2.user.contributionsCollection.restrictedContributionsCount);

  // Test 3: Specific date range (e.g., 2024)
  console.log('\n=== Test 3: Year 2024 ===');
  const res3: any = await octokit.graphql(query2, {
    username,
    from: '2024-01-01T00:00:00Z'
  });
  console.log('Commits:', res3.user.contributionsCollection.totalCommitContributions);

  // Test 4: Try with `to` parameter (current year)
  console.log('\n=== Test 4: From 2021 to now ===');
  const query4 = `
    query($username: String!, $from: DateTime!, $to: DateTime!) {
      user(login: $username) {
        contributionsCollection(from: $from, to: $to) {
          totalCommitContributions
        }
      }
    }
  `;
  const res4: any = await octokit.graphql(query4, {
    username,
    from: '2021-01-01T00:00:00Z',
    to: new Date().toISOString()
  });
  console.log('Commits (2021-now):', res4.user.contributionsCollection.totalCommitContributions);
}

testContributions().catch(console.error);
