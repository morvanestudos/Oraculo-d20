-- AlterTable: add branching quest fields
ALTER TABLE "Quest" ADD COLUMN "branchKey" TEXT;
ALTER TABLE "Quest" ADD COLUMN "parentQuestId" INTEGER;
ALTER TABLE "Quest" ADD COLUMN "objectiveList" JSONB;
ALTER TABLE "Quest" ADD COLUMN "consequences" JSONB;
ALTER TABLE "Quest" ADD COLUMN "hidden" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Quest" ADD COLUMN "priority" INTEGER NOT NULL DEFAULT 0;
