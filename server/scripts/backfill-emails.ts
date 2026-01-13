/**
 * Backfill script to resolve GitHub emails for all candidates
 * Run with: npx ts-node scripts/backfill-emails.ts
 */

import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();
const GITHUB_TOKEN = process.env.GITHUB_API_TOKEN;

if (!GITHUB_TOKEN) {
    console.error('❌ GITHUB_API_TOKEN not set');
    process.exit(1);
}

// Import the email resolver from github.ts
async function resolveGitHubEmail(token: string, username: string): Promise<string | null> {
    const { Octokit } = await import('@octokit/rest');
    const octokit = new Octokit({ auth: token });

    console.log(`  [GitHub] Resolving email for ${username}...`);

    // Strategy 1: Try events API first (fast, gets commit emails)
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

            for (const event of events) {
                if (event.type === 'PushEvent' && event.payload?.commits) {
                    for (const commit of event.payload.commits) {
                        if (commit.author?.email) {
                            const email = commit.author.email;
                            if (!email.includes('noreply.github.com') && !email.includes('@users.noreply')) {
                                return email;
                            }
                        }
                    }
                }
            }
        }
    } catch (error) {
        // Continue to next strategy
    }

    // Strategy 2: Get a recent commit and fetch its .patch file
    try {
        const { data: repos } = await octokit.rest.repos.listForUser({
            username,
            sort: 'pushed',
            per_page: 5
        });

        for (const repo of repos) {
            if (repo.fork) continue;

            try {
                const { data: commits } = await octokit.rest.repos.listCommits({
                    owner: username,
                    repo: repo.name,
                    author: username,
                    per_page: 1
                });

                if (commits.length > 0) {
                    const commitSha = commits[0].sha;
                    const patchUrl = `https://github.com/${username}/${repo.name}/commit/${commitSha}.patch`;
                    const patchResponse = await fetch(patchUrl, {
                        headers: { 'User-Agent': 'Vibechekk' }
                    });

                    if (patchResponse.ok) {
                        const patchText = await patchResponse.text();
                        const fromMatch = patchText.match(/From:\s*(?:[^<]*<)?([^>@\s]+\@[^>\s]+)/i);
                        if (fromMatch && fromMatch[1]) {
                            const email = fromMatch[1];
                            if (!email.includes('noreply.github.com') && !email.includes('@users.noreply')) {
                                return email;
                            }
                        }
                    }
                }
            } catch {
                // Continue to next repo
            }
        }
    } catch (error) {
        // Continue to next strategy
    }

    // Strategy 3: Try the GraphQL API
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
            return response.user.email;
        }
    } catch {
        // No email found
    }

    return null;
}

async function backfillEmails() {
    console.log('🔍 Finding candidates without emails...\n');

    const candidates = await prisma.candidate.findMany({
        where: {
            email: null
        },
        select: {
            id: true,
            githubHandle: true,
            name: true,
        }
    });

    console.log(`Found ${candidates.length} candidates without emails\n`);

    let resolved = 0;
    let failed = 0;

    for (const candidate of candidates) {
        console.log(`[${resolved + failed + 1}/${candidates.length}] ${candidate.githubHandle}`);

        try {
            const email = await resolveGitHubEmail(GITHUB_TOKEN, candidate.githubHandle);

            if (email) {
                await prisma.candidate.update({
                    where: { id: candidate.id },
                    data: { email }
                });
                console.log(`  ✅ Found: ${email}`);
                resolved++;
            } else {
                console.log(`  ❌ No email found`);
                failed++;
            }
        } catch (error: any) {
            console.log(`  ❌ Error: ${error.message}`);
            failed++;
        }

        // Rate limit delay
        await new Promise(r => setTimeout(r, 500));
    }

    console.log('\n📊 Results:');
    console.log(`  ✅ Resolved: ${resolved}`);
    console.log(`  ❌ Failed: ${failed}`);
    console.log(`  📧 Total: ${candidates.length}`);
}

backfillEmails()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
