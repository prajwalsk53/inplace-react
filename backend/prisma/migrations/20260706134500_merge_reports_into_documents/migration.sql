-- The PHP app stores interim/final placement reports as rows in `documents`
-- (doc_type IN ('interim_report','final_report')), not a separate `reports`
-- table. Merge the earlier (incorrect) Report model into Document to match.

ALTER TABLE "Document" ADD COLUMN "status" TEXT NOT NULL DEFAULT 'pending';
ALTER TABLE "Document" ADD COLUMN "reviewerFeedback" TEXT;
ALTER TABLE "Document" ADD COLUMN "reviewedAt" TIMESTAMP(3);
ALTER TABLE "Document" ADD COLUMN "reviewedById" INTEGER;

INSERT INTO "Document" ("placementId", "uploadedById", "fileName", "filePath", "fileSize", "category", "status", "reviewerFeedback", "reviewedAt", "createdAt")
SELECT
  r."placementId",
  r."studentId",
  r."title",
  COALESCE(r."filePath", ''),
  r."fileSize",
  CASE r."reportType" WHEN 'interim' THEN 'interim_report' WHEN 'final' THEN 'final_report' ELSE r."reportType" END,
  CASE r."status" WHEN 'reviewed' THEN 'approved' ELSE r."status" END,
  r."tutorFeedback",
  r."reviewedAt",
  r."submittedAt"
FROM "Report" r;

DROP TABLE "Report";

ALTER TABLE "Document" ADD CONSTRAINT "Document_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
