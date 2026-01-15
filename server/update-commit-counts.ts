import { PrismaClient } from '@prisma/client';
import { fetchUserStats } from './src/lib/github.js';
import dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

async function updateCommitCounts() {
  const GITHUB_TOKEN = process.env.GITHUB_API_TOKEN;

  if (!GITHUB_TOKEN) {
    console.error('❌ GITHUB_API_TOKEN not set in .env');
    process.exit(1);
  }

  console.log('🔄 Fetching all reports to update commit counts...\n');

  const reports = await prisma.vibeReport.findMany({
    include: {
      candidate: true
    },
    orderBy: {
      createdAt: 'desc'
    }
  });

  console.log(`📊 Found ${reports.length} reports to process\n`);

  let updated = 0;
  let skipped = 0;
  let errors = 0;

  for (const report of reports) {
    const githubHandle = report.candidate.githubHandle;
    const metadata = report.metadata as any;
    const oldCommits = metadata?.userStats?.totalCommits || 0;

    try {
      console.log(`🔍 Fetching stats for ${githubHandle}...`);

      const stats = await fetchUserStats(GITHUB_TOKEN, githubHandle);

      if (!stats) {
        console.log(`⚠️  Could not fetch stats for ${githubHandle}`);
        skipped++;
        continue;
      }

      const newCommits = stats.totalCommits;

      if (newCommits === oldCommits) {
        console.log(`✅ ${githubHandle}: ${oldCommits} commits (no change)`);
        skipped++;
        continue;
      }

      // Update the metadata
      const updatedMetadata = {
        ...metadata,
        userStats: {
          ...metadata.userStats,
          totalCommits: newCommits
        }
      };

      await prisma.vibeReport.update({
        where: { id: report.id },
        data: { metadata: updatedMetadata }
      });

      console.log(`✅ ${githubHandle}: ${oldCommits} → ${newCommits} commits (updated)`);
      updated++;

      // Rate limit: GitHub allows 5000 requests/hour with auth
      // Sleep 1 second between requests to be safe
      await new Promise(resolve => setTimeout(resolve, 1000));

    } catch (error: any) {
      console.error(`❌ Error processing ${githubHandle}:`, error.message);
      errors++;
    }
  }

  console.log('\n📊 Summary:');
  console.log(`✅ Updated: ${updated}`);
  console.log(`⏭️  Skipped (no change): ${skipped}`);
  console.log(`❌ Errors: ${errors}`);
  console.log(`📋 Total: ${reports.length}`);

  await prisma.$disconnect();
}

updateCommitCounts().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
