-- Add tutorComments to Placement
ALTER TABLE "Placement" ADD COLUMN "tutorComments" TEXT;

-- Add new columns to PlacementChangeRequest
ALTER TABLE "PlacementChangeRequest" ADD COLUMN "justification" TEXT;
ALTER TABLE "PlacementChangeRequest" ADD COLUMN "proposedDetails" TEXT;
ALTER TABLE "PlacementChangeRequest" ADD COLUMN "providerComment" TEXT;
ALTER TABLE "PlacementChangeRequest" ADD COLUMN "tutorComment" TEXT;

-- Split the old concatenated "details" column into justification/proposedDetails
UPDATE "PlacementChangeRequest"
SET "justification" = split_part("details", E'\n\nProposed: ', 1),
    "proposedDetails" = NULLIF(split_part("details", E'\n\nProposed: ', 2), '')
WHERE "details" IS NOT NULL;

UPDATE "PlacementChangeRequest" SET "justification" = COALESCE("justification", '') WHERE "justification" IS NULL;

-- Carry over the old tutor review note
UPDATE "PlacementChangeRequest" SET "tutorComment" = "reviewNotes" WHERE "reviewNotes" IS NOT NULL;

ALTER TABLE "PlacementChangeRequest" ALTER COLUMN "justification" SET NOT NULL;

ALTER TABLE "PlacementChangeRequest" DROP COLUMN "details";
ALTER TABLE "PlacementChangeRequest" DROP COLUMN "reviewNotes";

-- Recreate ChangeRequestStatus with the real PHP two-stage flow (provider then tutor)
ALTER TYPE "ChangeRequestStatus" RENAME TO "ChangeRequestStatus_old";
CREATE TYPE "ChangeRequestStatus" AS ENUM ('PENDING_PROVIDER', 'PENDING_TUTOR', 'APPROVED', 'REJECTED');

ALTER TABLE "PlacementChangeRequest" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "PlacementChangeRequest"
  ALTER COLUMN "status" TYPE "ChangeRequestStatus"
  USING (
    CASE "status"::text
      WHEN 'PENDING' THEN 'PENDING_TUTOR'
      ELSE "status"::text
    END
  )::"ChangeRequestStatus";
ALTER TABLE "PlacementChangeRequest" ALTER COLUMN "status" SET DEFAULT 'PENDING_PROVIDER';

DROP TYPE "ChangeRequestStatus_old";
