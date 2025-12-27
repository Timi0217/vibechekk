import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('🚀 DANGER: NUCLEAR PRODUCTION WASH...');

    // Deleting in correct order with raw queries to ensure clean state
    await prisma.$executeRawUnsafe(`TRUNCATE TABLE "VibeReport" CASCADE;`);
    await prisma.$executeRawUnsafe(`TRUNCATE TABLE "Candidate" CASCADE;`);
    await prisma.$executeRawUnsafe(`TRUNCATE TABLE "User" CASCADE;`);

    const reportCount = await prisma.vibeReport.count();
    const candidateCount = await prisma.candidate.count();
    console.log(`📊 Final Verification - Reports: ${reportCount}, Candidates: ${candidateCount}`);

    if (reportCount === 0 && candidateCount === 0) {
        console.log('✨ Database is 100% CLEAN.');
    } else {
        console.log('⚠️ Warning: Nuclear wash failed!');
    }
}

main()
    .catch((e) => {
        console.error('❌ Flush failed:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
