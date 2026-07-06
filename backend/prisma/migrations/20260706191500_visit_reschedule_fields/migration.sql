-- AlterTable
ALTER TABLE "PlacementOpportunity" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "ProviderEvaluation" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "Visit" ADD COLUMN     "rescheduleNotes" TEXT,
ADD COLUMN     "rescheduleProposedAt" TIMESTAMP(3);
