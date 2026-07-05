-- AlterTable
ALTER TABLE "Announcement" ADD COLUMN     "expiresAt" TIMESTAMP(3),
ADD COLUMN     "isPinned" BOOLEAN NOT NULL DEFAULT false;
