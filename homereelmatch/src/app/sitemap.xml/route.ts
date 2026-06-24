import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const revalidate = 3600;

export async function GET() {
  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL ?? "https://homereelmatch.vercel.app";

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

  const urls = [
    `  <url>\n    <loc>${appUrl}</loc>\n    <lastmod>${new Date().toISOString()}</lastmod>\n    <changefreq>daily</changefreq>\n    <priority>1.0</priority>\n  </url>`,
    ...videos.map(
      (v) =>
        `  <url>\n    <loc>${appUrl}/watch/${v.id}</loc>\n    <lastmod>${v.updatedAt.toISOString()}</lastmod>\n    <changefreq>weekly</changefreq>\n    <priority>0.8</priority>\n  </url>`
    ),
    ...hashtags.map(
      (h) =>
        `  <url>\n    <loc>${appUrl}/tag/${encodeURIComponent(h.tagName)}</loc>\n    <lastmod>${new Date().toISOString()}</lastmod>\n    <changefreq>weekly</changefreq>\n    <priority>0.6</priority>\n  </url>`
    ),
  ];

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join("\n")}
</urlset>`;

  return new NextResponse(xml, {
    headers: { "Content-Type": "application/xml" },
  });
}
