-- AlterTable
ALTER TABLE "Announcement" ADD COLUMN     "audienceType" TEXT NOT NULL DEFAULT 'all',
ADD COLUMN     "targetValue" TEXT;
