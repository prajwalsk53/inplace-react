-- AlterTable
ALTER TABLE "Report" ADD COLUMN     "fileSize" INTEGER,
ADD COLUMN     "reportType" TEXT NOT NULL DEFAULT 'other',
ALTER COLUMN "status" SET DEFAULT 'pending';
