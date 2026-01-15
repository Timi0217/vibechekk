import { Octokit } from 'octokit';
import dotenv from 'dotenv';

dotenv.config();

const octokit = new Octokit({ auth: process.env.GITHUB_API_TOKEN });

async function testQuery() {
  const username = 'elvniv';

  // First query to get account creation date
  const query = `
    query($username: String!) {
      user(login: $username) {
        name
        createdAt
        contributionsCollection {
          totalCommitContributions
        }
      }
    }
  `;

  try {
    const response: any = await octokit.graphql(query, { username });

    console.log('User:', response.user.name);
    console.log('Account created:', response.user.createdAt);
    console.log('Default contributionsCollection (last year):', response.user.contributionsCollection.totalCommitContributions);

    // Second query using account creation date
    const lifetimeQuery = `
      query($username: String!, $from: DateTime!) {
        user(login: $username) {
          contributionsCollection(from: $from) {
            totalCommitContributions
          }
        }
      }
    `;

    const lifetimeResponse: any = await octokit.graphql(lifetimeQuery, {
      username,
      from: response.user.createdAt
    });

    console.log('Lifetime contributions (from account creation):', lifetimeResponse.user.contributionsCollection.totalCommitContributions);
  } catch (error: any) {
    console.error('Error:', error.message);
    if (error.errors) {
      console.error('GraphQL errors:', JSON.stringify(error.errors, null, 2));
    }
  }
}

testQuery();
