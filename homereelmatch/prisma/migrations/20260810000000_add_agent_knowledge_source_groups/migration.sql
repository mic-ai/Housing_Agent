-- CreateEnum
CREATE TYPE "AgentKnowledgeSourceType" AS ENUM ('URL', 'PDF');

-- CreateTable
CREATE TABLE "agent_knowledge_source_groups" (
    "id" TEXT NOT NULL,
    "topic" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "entryId" TEXT,
    "lastCrawledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "agent_knowledge_source_groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agent_knowledge_registered_sources" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "sourceType" "AgentKnowledgeSourceType" NOT NULL,
    "url" TEXT,
    "storagePath" TEXT,
    "publicUrl" TEXT,
    "fileName" TEXT,
    "title" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "agent_knowledge_registered_sources_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "agent_knowledge_source_groups_entryId_key" ON "agent_knowledge_source_groups"("entryId");

-- CreateIndex
CREATE INDEX "agent_knowledge_source_groups_category_idx" ON "agent_knowledge_source_groups"("category");

-- CreateIndex
CREATE INDEX "agent_knowledge_registered_sources_groupId_idx" ON "agent_knowledge_registered_sources"("groupId");

-- AddForeignKey
ALTER TABLE "agent_knowledge_source_groups" ADD CONSTRAINT "agent_knowledge_source_groups_entryId_fkey" FOREIGN KEY ("entryId") REFERENCES "agent_knowledge_entries"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agent_knowledge_registered_sources" ADD CONSTRAINT "agent_knowledge_registered_sources_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "agent_knowledge_source_groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;
