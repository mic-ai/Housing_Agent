import type { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://homereelmatch.vercel.app";

  let videos: { id: string; updatedAt: Date }[] = [];
  let hashtags: { tagName: string }[] = [];
  try {
    [videos, hashtags] = await Promise.all([
      prisma.video.findMany({
        where: { isActive: true },
        select: { id: true, updatedAt: true },
        orderBy: { createdAt: "desc" },
      }),
      prisma.hashtag.findMany({
        select: { tagName: true },
        orderBy: { usageCount: "desc" },
        take: 200,
      }),
    ]);
  } catch {
    // DB unavailable — return static routes only
  }

  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: appUrl,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1.0,
    },
  ];

  const videoRoutes: MetadataRoute.Sitemap = videos.map((v) => ({
    url: `${appUrl}/watch/${v.id}`,
    lastModified: v.updatedAt,
    changeFrequency: "weekly" as const,
    priority: 0.8,
  }));

  const tagRoutes: MetadataRoute.Sitemap = hashtags.map((h) => ({
    url: `${appUrl}/tag/${encodeURIComponent(h.tagName)}`,
    lastModified: new Date(),
    changeFrequency: "weekly" as const,
    priority: 0.6,
  }));

  return [...staticRoutes, ...videoRoutes, ...tagRoutes];
}
