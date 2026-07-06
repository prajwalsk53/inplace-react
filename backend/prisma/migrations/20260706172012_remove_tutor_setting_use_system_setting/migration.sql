/*
  Warnings:

  - You are about to drop the `TutorSetting` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "TutorSetting" DROP CONSTRAINT "TutorSetting_tutorId_fkey";

-- DropTable
DROP TABLE "TutorSetting";
