-- CreateTable
CREATE TABLE "CampaignMemory" (
    "id" SERIAL NOT NULL,
    "campaignId" INTEGER NOT NULL,
    "currentScene" TEXT,
    "currentLocation" TEXT,
    "currentObjective" TEXT,
    "currentThreat" TEXT,
    "tensionLevel" INTEGER NOT NULL DEFAULT 1,
    "discoveredClues" JSONB NOT NULL DEFAULT '[]',
    "activeNPCs" JSONB NOT NULL DEFAULT '[]',
    "activeEnemies" JSONB NOT NULL DEFAULT '[]',
    "storyFlags" JSONB NOT NULL DEFAULT '{}',
    "turnCount" INTEGER NOT NULL DEFAULT 0,
    "lastPlayerAction" TEXT,
    "lastMasterAction" TEXT,
    "summary" TEXT,
    "lastSummaryTurn" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CampaignMemory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CampaignMemory_campaignId_key" ON "CampaignMemory"("campaignId");

-- AddForeignKey
ALTER TABLE "CampaignMemory" ADD CONSTRAINT "CampaignMemory_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
