-- AlterTable: add questType and objectives to Quest
ALTER TABLE "Quest" ADD COLUMN "questType" TEXT NOT NULL DEFAULT 'secondary';
ALTER TABLE "Quest" ADD COLUMN "objectives" JSONB NOT NULL DEFAULT '[]';
