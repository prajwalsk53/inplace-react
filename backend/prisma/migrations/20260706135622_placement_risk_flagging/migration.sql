-- AlterTable
ALTER TABLE "Placement" ADD COLUMN     "riskFlag" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "riskFlaggedAt" TIMESTAMP(3),
ADD COLUMN     "riskFlaggedById" INTEGER,
ADD COLUMN     "riskLevel" TEXT,
ADD COLUMN     "riskNotes" TEXT;

-- AddForeignKey
ALTER TABLE "Placement" ADD CONSTRAINT "Placement_riskFlaggedById_fkey" FOREIGN KEY ("riskFlaggedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
