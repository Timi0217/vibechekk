/*
  Warnings:

  - Changed the type of `meritPoints` on the `VibeReport` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- DropForeignKey
ALTER TABLE "VibeReport" DROP CONSTRAINT "VibeReport_userId_fkey";

-- AlterTable
ALTER TABLE "VibeReport" ADD COLUMN     "guestIp" TEXT,
ADD COLUMN     "recruiterSummary" TEXT,
ADD COLUMN     "repoName" TEXT,
ADD COLUMN     "tier" TEXT NOT NULL DEFAULT 'COMMON',
ALTER COLUMN "userId" DROP NOT NULL,
DROP COLUMN "meritPoints",
ADD COLUMN     "meritPoints" JSONB NOT NULL;

-- AddForeignKey
ALTER TABLE "VibeReport" ADD CONSTRAINT "VibeReport_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
