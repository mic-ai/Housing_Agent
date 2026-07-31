-- CreateTable
CREATE TABLE "visitors" (
    "id" TEXT NOT NULL,
    "visitDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "venueId" TEXT,
    "consentGiven" BOOLEAN NOT NULL DEFAULT false,
    "consentedAt" TIMESTAMP(3),
    "lineOptIn" BOOLEAN NOT NULL DEFAULT false,
    "lineOptInAt" TIMESTAMP(3),
    "viewerId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "visitors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "visitor_house_maker_interests" (
    "id" TEXT NOT NULL,
    "visitorId" TEXT NOT NULL,
    "houseMakerId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "visitor_house_maker_interests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "visitor_hashtag_interests" (
    "id" TEXT NOT NULL,
    "visitorId" TEXT NOT NULL,
    "hashtagId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "visitor_hashtag_interests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "visitor_video_views" (
    "id" TEXT NOT NULL,
    "visitorId" TEXT,
    "viewerId" TEXT NOT NULL,
    "videoId" TEXT,
    "source" TEXT NOT NULL,
    "viewedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "visitor_video_views_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "visitor_contacts" (
    "id" TEXT NOT NULL,
    "visitorId" TEXT NOT NULL,
    "converted" BOOLEAN NOT NULL DEFAULT false,
    "contactChannel" "ContactMethod",
    "contactRequestId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "visitor_contacts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "visitors_viewerId_idx" ON "visitors"("viewerId");

-- CreateIndex
CREATE INDEX "visitors_visitDate_idx" ON "visitors"("visitDate");

-- CreateIndex
CREATE UNIQUE INDEX "visitor_house_maker_interests_visitorId_houseMakerId_key" ON "visitor_house_maker_interests"("visitorId", "houseMakerId");

-- CreateIndex
CREATE UNIQUE INDEX "visitor_hashtag_interests_visitorId_hashtagId_key" ON "visitor_hashtag_interests"("visitorId", "hashtagId");

-- CreateIndex
CREATE INDEX "visitor_video_views_visitorId_idx" ON "visitor_video_views"("visitorId");

-- CreateIndex
CREATE INDEX "visitor_video_views_viewerId_idx" ON "visitor_video_views"("viewerId");

-- CreateIndex
CREATE INDEX "visitor_video_views_source_idx" ON "visitor_video_views"("source");

-- CreateIndex
CREATE UNIQUE INDEX "visitor_contacts_contactRequestId_key" ON "visitor_contacts"("contactRequestId");

-- AddForeignKey
ALTER TABLE "visitors" ADD CONSTRAINT "visitors_venueId_fkey" FOREIGN KEY ("venueId") REFERENCES "venues"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "visitors" ADD CONSTRAINT "visitors_viewerId_fkey" FOREIGN KEY ("viewerId") REFERENCES "viewer_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "visitor_house_maker_interests" ADD CONSTRAINT "visitor_house_maker_interests_visitorId_fkey" FOREIGN KEY ("visitorId") REFERENCES "visitors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "visitor_house_maker_interests" ADD CONSTRAINT "visitor_house_maker_interests_houseMakerId_fkey" FOREIGN KEY ("houseMakerId") REFERENCES "house_makers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "visitor_hashtag_interests" ADD CONSTRAINT "visitor_hashtag_interests_visitorId_fkey" FOREIGN KEY ("visitorId") REFERENCES "visitors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "visitor_hashtag_interests" ADD CONSTRAINT "visitor_hashtag_interests_hashtagId_fkey" FOREIGN KEY ("hashtagId") REFERENCES "hashtags"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "visitor_video_views" ADD CONSTRAINT "visitor_video_views_visitorId_fkey" FOREIGN KEY ("visitorId") REFERENCES "visitors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "visitor_video_views" ADD CONSTRAINT "visitor_video_views_viewerId_fkey" FOREIGN KEY ("viewerId") REFERENCES "viewer_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "visitor_video_views" ADD CONSTRAINT "visitor_video_views_videoId_fkey" FOREIGN KEY ("videoId") REFERENCES "videos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "visitor_contacts" ADD CONSTRAINT "visitor_contacts_visitorId_fkey" FOREIGN KEY ("visitorId") REFERENCES "visitors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "visitor_contacts" ADD CONSTRAINT "visitor_contacts_contactRequestId_fkey" FOREIGN KEY ("contactRequestId") REFERENCES "contact_requests"("id") ON DELETE SET NULL ON UPDATE CASCADE;
