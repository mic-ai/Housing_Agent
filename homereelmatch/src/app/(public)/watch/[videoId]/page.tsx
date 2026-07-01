import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { WatchClientShell } from "@/components/video/WatchClientShell";
import { WatchOverlay } from "@/components/video/WatchOverlay";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { extractYouTubeId } from "@/lib/utils";
import type { Metadata } from "next";

interface WatchPageProps {
  params: Promise<{ videoId: string }>;
}

export async function generateMetadata({ params }: WatchPageProps): Promise<Metadata> {
  const { videoId } = await params;
  const video = await prisma.video.findUnique({
    where: { id: videoId },
    include: { videoHashtags: { include: { hashtag: true } } },
  });
  if (!video) return { title: "動画が見つかりません" };
  const ytId = video.platform === "YOUTUBE" ? extractYouTubeId(video.url) : null;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://homereelmatch.vercel.app";
  const description =
    video.description ??
    `${video.title}の住宅情報ショート動画。HomeReelMatchで担当営業マンとマッチングしよう。`;
  const keywords = video.videoHashtags.map((vh) => vh.hashtag.tagName);

  return {
    title: video.title,
    description,
    keywords: [...keywords, "住宅", "動画"],
    alternates: {
      canonical: `/watch/${videoId}`,
    },
    openGraph: {
      title: video.title,
      description,
      type: "video.other",
      url: `${appUrl}/watch/${video.id}`,
      images: video.thumbnailUrl
        ? [{ url: video.thumbnailUrl, width: 1280, height: 720, alt: video.title }]
        : [],
      videos: ytId
        ? [{ url: `https://www.youtube.com/embed/${ytId}`, width: 1280, height: 720, type: "text/html" }]
        : [],
    },
    twitter: {
      card: "player",
      title: video.title,
      description,
      images: video.thumbnailUrl ? [video.thumbnailUrl] : [],
      ...(ytId && {
        players: [{
          playerUrl: `https://www.youtube.com/embed/${ytId}`,
          streamUrl: `https://www.youtube.com/embed/${ytId}`,
          width: 1280,
          height: 720,
        }],
      }),
    },
  };
}

export default async function WatchPage({ params }: WatchPageProps) {
  const { videoId } = await params;

  const video = await prisma.video.findUnique({
    where: { id: videoId },
    include: {
      videoHashtags: { include: { hashtag: true } },
      salespersonVideos: {
        include: {
          salesperson: {
            select: {
              id: true,
              name: true,
              profileImage: true,
              bio: true,
              company: {
                select: {
                  id: true,
                  name: true,
                  modelHouseName: true,
                  modelHouseAddress: true,
                },
              },
              faceVideos: { orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] },
            },
          },
        },
        // isPrimary: true を優先し、なければ最古の接続にフォールバック
        orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }],
        take: 1,
      },
    },
  });

  if (!video) notFound();

  const primaryAssignment = video.salespersonVideos[0] ?? null;
  const primarySalesperson = primaryAssignment?.salesperson ?? null;

  // 接続設定で指定された顔出し動画を優先し、なければ営業マンのグローバル設定を使用
  const preRollUrl =
    primaryAssignment?.preRollPublicUrl ??
    primarySalesperson?.faceVideos.find((v) => v.rollType === "pre")?.publicUrl;
  const postRollUrl =
    primaryAssignment?.postRollPublicUrl ??
    primarySalesperson?.faceVideos.find((v) => v.rollType === "post")?.publicUrl;
  const preRollDurationSec =
    primaryAssignment?.preRollDurationSec ??
    primarySalesperson?.faceVideos.find((v) => v.rollType === "pre")?.durationSec ??
    null;
  const postRollDurationSec =
    primaryAssignment?.postRollDurationSec ??
    primarySalesperson?.faceVideos.find((v) => v.rollType === "post")?.durationSec ??
    null;

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://homereelmatch.vercel.app";
  const canonicalUrl = `${appUrl}/watch/${video.id}`;

  const ytId = video.platform === "YOUTUBE" ? extractYouTubeId(video.url) : null;
  const hashtags = video.videoHashtags.map((vh) => vh.hashtag);

  const videoJsonLd = {
    "@context": "https://schema.org",
    "@type": "VideoObject",
    name: video.title,
    description: video.description ?? `${video.title}の住宅情報ショート動画`,
    thumbnailUrl: video.thumbnailUrl ?? (ytId ? `https://img.youtube.com/vi/${ytId}/hqdefault.jpg` : undefined),
    uploadDate: video.createdAt.toISOString(),
    contentUrl: video.url,
    embedUrl: ytId ? `https://www.youtube.com/embed/${ytId}` : undefined,
    url: canonicalUrl,
    keywords: hashtags.map((h) => h.tagName).join(", "),
    inLanguage: "ja",
  };

  const salespersonVideo =
    primaryAssignment && primarySalesperson
      ? {
          id: primaryAssignment.id,
          salespersonId: primaryAssignment.salespersonId,
          preRollPublicUrl: preRollUrl ?? null,
          preRollDurationSec,
          postRollPublicUrl: postRollUrl ?? null,
          postRollDurationSec,
          isPrimary: primaryAssignment.isPrimary,
          salesperson: {
            id: primarySalesperson.id,
            name: primarySalesperson.name,
            profileImage: primarySalesperson.profileImage,
            bio: primarySalesperson.bio,
            company: primarySalesperson.company
              ? {
                  id: primarySalesperson.company.id,
                  name: primarySalesperson.company.name,
                  modelHouseName: primarySalesperson.company.modelHouseName,
                  modelHouseAddress: primarySalesperson.company.modelHouseAddress,
                }
              : null,
          },
        }
      : null;

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(videoJsonLd) }}
      />
      <main className="min-h-screen bg-black">
        {/* パンくずリスト（SEO用・視覚的にも表示） */}
        <div className="absolute top-0 left-0 right-0 z-20 px-4 pt-3 pointer-events-none">
          <div className="pointer-events-auto">
            <Breadcrumb
              appUrl={appUrl}
              items={[
                { name: "ホーム", href: "/" },
                ...(hashtags[0] ? [{ name: `#${hashtags[0].tagName}`, href: `/tag/${encodeURIComponent(hashtags[0].tagName)}` }] : []),
                { name: video.title },
              ]}
            />
          </div>
        </div>

        <div className="flex items-center justify-center min-h-screen">
          <div className="relative w-full max-w-sm mx-auto aspect-[9/16] bg-black">
            <WatchOverlay
              videoId={video.id}
              videoTitle={video.title}
              videoUrl={canonicalUrl}
            />
            <WatchClientShell
              platform={video.platform}
              url={video.url}
              preRollUrl={preRollUrl}
              postRollUrl={postRollUrl}
              videoId={video.id}
              title={video.title}
              hashtags={hashtags}
              salespersonVideo={salespersonVideo}
            />
          </div>
        </div>
      </main>
    </>
  );
}
