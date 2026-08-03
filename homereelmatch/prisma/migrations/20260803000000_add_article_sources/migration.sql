-- CreateTable
CREATE TABLE "article_sources" (
    "id" TEXT NOT NULL,
    "articleId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "title" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "article_sources_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "article_sources_articleId_idx" ON "article_sources"("articleId");

-- AddForeignKey
ALTER TABLE "article_sources" ADD CONSTRAINT "article_sources_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "articles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
