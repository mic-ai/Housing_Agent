-- CreateTable
CREATE TABLE "viewer_salesperson_views" (
    "id" TEXT NOT NULL,
    "viewerId" TEXT NOT NULL,
    "salespersonId" TEXT NOT NULL,
    "videoId" TEXT,
    "viewCount" INTEGER NOT NULL DEFAULT 1,
    "lastViewedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "viewer_salesperson_views_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "viewer_saved_makers" (
    "id" TEXT NOT NULL,
    "viewerId" TEXT NOT NULL,
    "houseMakerId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "viewer_saved_makers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "viewer_salesperson_views_viewerId_salespersonId_key" ON "viewer_salesperson_views"("viewerId", "salespersonId");

-- CreateIndex
CREATE UNIQUE INDEX "viewer_saved_makers_viewerId_houseMakerId_key" ON "viewer_saved_makers"("viewerId", "houseMakerId");

-- AddForeignKey
ALTER TABLE "viewer_salesperson_views" ADD CONSTRAINT "viewer_salesperson_views_viewerId_fkey" FOREIGN KEY ("viewerId") REFERENCES "viewer_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "viewer_salesperson_views" ADD CONSTRAINT "viewer_salesperson_views_salespersonId_fkey" FOREIGN KEY ("salespersonId") REFERENCES "salespersons"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "viewer_salesperson_views" ADD CONSTRAINT "viewer_salesperson_views_videoId_fkey" FOREIGN KEY ("videoId") REFERENCES "videos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "viewer_saved_makers" ADD CONSTRAINT "viewer_saved_makers_viewerId_fkey" FOREIGN KEY ("viewerId") REFERENCES "viewer_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "viewer_saved_makers" ADD CONSTRAINT "viewer_saved_makers_houseMakerId_fkey" FOREIGN KEY ("houseMakerId") REFERENCES "house_makers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
