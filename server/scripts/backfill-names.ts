/**
 * Backfill Script: Populate missing candidate names from GitHub
 * 
 * This script fetches the display name for all candidates that don't have a name set,
 * using the GitHub API.
 * 
 * Usage: npx ts-node scripts/backfill-names.ts
 */

import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// ES module compatible __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env from server directory
dotenv.config({ path: join(__dirname, '..', '.env') });

const prisma = new PrismaClient();
const GITHUB_TOKEN = process.env.GITHUB_API_TOKEN || process.env.GITHUB_TOKEN;

if (!GITHUB_TOKEN) {
    console.error('❌ GITHUB_TOKEN not found in environment');
    process.exit(1);
}

async function fetchGitHubName(handle: string): Promise<string | null> {
    try {
        const response = await fetch(`https://api.github.com/users/${handle}`, {
            headers: {
                'Authorization': `Bearer ${GITHUB_TOKEN}`,
                'Accept': 'application/vnd.github.v3+json',
                'User-Agent': 'Vibechekk-Backfill'
            }
        });

        if (!response.ok) {
            console.log(`  ⚠️  GitHub API returned ${response.status} for ${handle}`);
            return null;
        }

        const data: any = await response.json();
        return data.name || null;
    } catch (error) {
        console.error(`  ❌ Error fetching ${handle}:`, error);
        return null;
    }
}

async function main() {
    console.log('🚀 Starting name backfill for candidates...\n');

    // Find all candidates without a name
    const candidatesWithoutName = await prisma.candidate.findMany({
        where: {
            name: null
        },
        select: {
            id: true,
            githubHandle: true
        }
    });

    console.log(`📊 Found ${candidatesWithoutName.length} candidates without names\n`);

    if (candidatesWithoutName.length === 0) {
        console.log('✅ All candidates already have names. Nothing to do!');
        return;
    }

    let updated = 0;
    let skipped = 0;
    let errors = 0;

    // Process in batches to avoid rate limiting
    const BATCH_SIZE = 10;
    const DELAY_BETWEEN_BATCHES = 2000; // 2 seconds

    for (let i = 0; i < candidatesWithoutName.length; i += BATCH_SIZE) {
        const batch = candidatesWithoutName.slice(i, i + BATCH_SIZE);
        console.log(`📦 Processing batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(candidatesWithoutName.length / BATCH_SIZE)}...`);

        const promises = batch.map(async (candidate) => {
            const name = await fetchGitHubName(candidate.githubHandle);

            if (name) {
                await prisma.candidate.update({
                    where: { id: candidate.id },
                    data: { name }
                });
                console.log(`  ✅ ${candidate.githubHandle} → "${name}"`);
                return 'updated';
            } else {
                console.log(`  ⏭️  ${candidate.githubHandle} has no display name on GitHub`);
                return 'skipped';
            }
        });

        const results = await Promise.all(promises);
        updated += results.filter(r => r === 'updated').length;
        skipped += results.filter(r => r === 'skipped').length;

        // Rate limit delay between batches
        if (i + BATCH_SIZE < candidatesWithoutName.length) {
            console.log(`  ⏳ Waiting ${DELAY_BETWEEN_BATCHES / 1000}s before next batch...`);
            await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_BATCHES));
        }
    }

    console.log('\n' + '='.repeat(50));
    console.log('📈 BACKFILL COMPLETE');
    console.log('='.repeat(50));
    console.log(`✅ Updated: ${updated}`);
    console.log(`⏭️  Skipped (no name on GitHub): ${skipped}`);
    console.log(`❌ Errors: ${errors}`);
    console.log('='.repeat(50));
}

main()
    .catch((e) => {
        console.error('❌ Script failed:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
