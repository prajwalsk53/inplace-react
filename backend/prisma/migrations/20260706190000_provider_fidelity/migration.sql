-- AlterTable
ALTER TABLE "Placement" ADD COLUMN     "providerApprovedAt" TIMESTAMP(3),
ADD COLUMN     "providerApprovedById" INTEGER,
ADD COLUMN     "providerFeedback" TEXT,
ADD COLUMN     "providerFeedbackAt" TIMESTAMP(3),
ADD COLUMN     "providerRejectedAt" TIMESTAMP(3),
ADD COLUMN     "providerRejectionReason" TEXT,
ADD COLUMN     "terminatedReason" TEXT;

-- AlterTable
ALTER TABLE "PlacementOpportunity" ADD COLUMN     "deadline" TIMESTAMP(3),
ADD COLUMN     "durationMonths" INTEGER,
ADD COLUMN     "postedById" INTEGER,
ADD COLUMN     "requirements" TEXT,
ADD COLUMN     "salaryRange" TEXT,
ADD COLUMN     "skillsRequired" TEXT,
ADD COLUMN     "startDateEst" TIMESTAMP(3),
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "ProviderEvaluation" ADD COLUMN     "additionalComments" TEXT,
ADD COLUMN     "areasForImprovement" TEXT,
ADD COLUMN     "attendance" INTEGER,
ADD COLUMN     "communication" INTEGER,
ADD COLUMN     "evalPeriod" TEXT NOT NULL DEFAULT 'ad_hoc',
ADD COLUMN     "initiative" INTEGER,
ADD COLUMN     "professionalism" INTEGER,
ADD COLUMN     "punctuality" INTEGER,
ADD COLUMN     "recommendFuture" BOOLEAN,
ADD COLUMN     "strengths" TEXT,
ADD COLUMN     "technicalSkills" INTEGER,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "ProviderIssue" ADD COLUMN     "desiredOutcome" TEXT,
ADD COLUMN     "resolvedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "PlacementNotification" (
    "id" SERIAL NOT NULL,
    "placementId" INTEGER NOT NULL,
    "companyId" INTEGER NOT NULL,
    "raisedById" INTEGER NOT NULL,
    "notificationType" TEXT NOT NULL,
    "effectiveDate" TIMESTAMP(3),
    "reason" TEXT NOT NULL,
    "details" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlacementNotification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ProviderEvaluation_placementId_evalPeriod_key" ON "ProviderEvaluation"("placementId", "evalPeriod");

-- AddForeignKey
ALTER TABLE "Placement" ADD CONSTRAINT "Placement_providerApprovedById_fkey" FOREIGN KEY ("providerApprovedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlacementOpportunity" ADD CONSTRAINT "PlacementOpportunity_postedById_fkey" FOREIGN KEY ("postedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlacementNotification" ADD CONSTRAINT "PlacementNotification_placementId_fkey" FOREIGN KEY ("placementId") REFERENCES "Placement"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlacementNotification" ADD CONSTRAINT "PlacementNotification_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlacementNotification" ADD CONSTRAINT "PlacementNotification_raisedById_fkey" FOREIGN KEY ("raisedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
