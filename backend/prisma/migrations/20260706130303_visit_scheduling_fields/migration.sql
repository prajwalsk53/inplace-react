-- AlterTable
ALTER TABLE "Visit" ADD COLUMN     "durationHours" DOUBLE PRECISION NOT NULL DEFAULT 2,
ADD COLUMN     "location" TEXT,
ADD COLUMN     "meetingLink" TEXT,
ALTER COLUMN "visitType" SET DEFAULT 'physical';

-- DataFix: old rows used 'in_person' for the physical visit type
UPDATE "Visit" SET "visitType" = 'physical' WHERE "visitType" = 'in_person';
