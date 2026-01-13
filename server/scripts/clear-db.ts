import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('🗑️ Starting database cleanup...');

    try {
        // Delete in reverse order of dependencies
        const reportCount = await prisma.vibeReport.deleteMany();
        console.log(`✅ Deleted ${reportCount.count} VibeReports`);

        // Candidates have a relationship with Users, and VibeReports have a relationship with both
        const candidateCount = await prisma.candidate.deleteMany();
        console.log(`✅ Deleted ${candidateCount.count} Candidates`);

        const userCount = await prisma.user.deleteMany();
        console.log(`✅ Deleted ${userCount.count} Users`);

        console.log('✨ Database is now fresh and clean!');
    } catch (error) {
        console.error('❌ Error clearing database:', error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
