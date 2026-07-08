-- CreateEnum
CREATE TYPE "ArticleDifficulty" AS ENUM ('BEGINNER', 'BASIC');

-- CreateEnum
CREATE TYPE "ArticleStatus" AS ENUM ('DRAFT', 'PUBLISHED');

-- CreateTable
CREATE TABLE "learning_phases" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "learning_phases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "articles" (
    "id" TEXT NOT NULL,
    "phaseId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "bodyMarkdown" TEXT NOT NULL,
    "estimatedMinutes" INTEGER NOT NULL,
    "difficulty" "ArticleDifficulty" NOT NULL,
    "translateBoxLabel" TEXT,
    "translateBoxValue" TEXT,
    "status" "ArticleStatus" NOT NULL DEFAULT 'DRAFT',
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "articles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "article_comparison_rows" (
    "id" TEXT NOT NULL,
    "articleId" TEXT NOT NULL,
    "houseMakerId" TEXT,
    "priceRangeTag" TEXT,
    "featureTag" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "article_comparison_rows_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "viewer_profiles" (
    "id" TEXT NOT NULL,
    "viewerToken" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "viewer_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "viewer_article_progress" (
    "id" TEXT NOT NULL,
    "viewerId" TEXT NOT NULL,
    "articleId" TEXT NOT NULL,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "viewer_article_progress_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "learning_phases_key_key" ON "learning_phases"("key");

-- CreateIndex
CREATE INDEX "articles_phaseId_order_idx" ON "articles"("phaseId", "order");

-- CreateIndex
CREATE UNIQUE INDEX "viewer_profiles_viewerToken_key" ON "viewer_profiles"("viewerToken");

-- CreateIndex
CREATE UNIQUE INDEX "viewer_article_progress_viewerId_articleId_key" ON "viewer_article_progress"("viewerId", "articleId");

-- AddForeignKey
ALTER TABLE "articles" ADD CONSTRAINT "articles_phaseId_fkey" FOREIGN KEY ("phaseId") REFERENCES "learning_phases"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "article_comparison_rows" ADD CONSTRAINT "article_comparison_rows_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "articles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "article_comparison_rows" ADD CONSTRAINT "article_comparison_rows_houseMakerId_fkey" FOREIGN KEY ("houseMakerId") REFERENCES "house_makers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "viewer_article_progress" ADD CONSTRAINT "viewer_article_progress_viewerId_fkey" FOREIGN KEY ("viewerId") REFERENCES "viewer_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "viewer_article_progress" ADD CONSTRAINT "viewer_article_progress_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "articles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
