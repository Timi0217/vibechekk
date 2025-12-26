import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
dotenv.config();

const prisma = new PrismaClient();

async function main() {
    console.log('Starting total database flush...');
    try {
        const deletedReports = await prisma.vibeReport.deleteMany({});
        console.log(`Deleted ${deletedReports.count} reports.`);

        const deletedCandidates = await prisma.candidate.deleteMany({});
        console.log(`Deleted ${deletedCandidates.count} candidates.`);

        console.log('Database flush complete.');
    } catch (err) {
        console.error('Flush failed:', err);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

main();
