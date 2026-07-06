/*
  Warnings:

  - You are about to drop the column `purpose` on the `ProviderMeeting` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "ProviderMeeting" DROP COLUMN "purpose",
ADD COLUMN     "agenda" TEXT,
ADD COLUMN     "contactEmail" TEXT,
ADD COLUMN     "contactName" TEXT,
ADD COLUMN     "durationHours" DOUBLE PRECISION NOT NULL DEFAULT 1,
ADD COLUMN     "location" TEXT,
ADD COLUMN     "meetingLink" TEXT,
ADD COLUMN     "meetingType" TEXT NOT NULL DEFAULT 'physical',
ALTER COLUMN "status" SET DEFAULT 'scheduled';
