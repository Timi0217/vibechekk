/**
 * Clear analyzed profiles from database
 * Run with: npx tsx clear-profiles.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function clearProfiles() {
  console.log('🧹 Starting database cleanup...\n');

  try {
    // Delete all VibeReports first (due to foreign key constraints)
    const deletedReports = await prisma.vibeReport.deleteMany({});
    console.log(`✅ Deleted ${deletedReports.count} VibeReport records`);

    // Delete all Candidates
    const deletedCandidates = await prisma.candidate.deleteMany({});
    console.log(`✅ Deleted ${deletedCandidates.count} Candidate records`);

    // Optionally reset user usage counts (uncomment if needed)
    // const resetUsers = await prisma.user.updateMany({
    //   data: {
    //     usageCount: 0,
    //     lastResetAt: new Date()
    //   }
    // });
    // console.log(`✅ Reset usage counts for ${resetUsers.count} users`);

    console.log('\n✨ Database cleared successfully!');
    console.log('You can now test with fresh profiles.\n');

  } catch (error) {
    console.error('❌ Error clearing database:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

clearProfiles();
