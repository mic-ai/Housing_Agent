import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { CompositePlayer } from "@/components/video/CompositePlayer";
import { VideoFooter } from "@/components/video/VideoFooter";
import { WatchOverlay } from "@/components/video/WatchOverlay";
import { extractYouTubeId } from "@/lib/utils";
import type { Metadata } from "next";

interface WatchPageProps {
  params: Promise<{ videoId: string }>;
}

export async function generateMetadata({ params }: WatchPageProps): Promise<Metadata> {
  const { videoId } = await params;
  const video = await prisma.video.findUnique({ where: { id: videoId } });
  if (!video) return { title: "動画が見つかりません" };
  const ytId = video.platform === "YOUTUBE" ? extractYouTubeId(video.url) : null;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://homereelmatch.example.com";

  return {
    title: video.title,
    description: video.description ?? undefined,
    openGraph: {
      title: video.title,
      description: video.description ?? undefined,
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
      description: video.description ?? undefined,
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
    where: { id: videoId, isActive: true },
    include: {
      videoHashtags: { include: { hashtag: true } },
      salespersonVideos: {
        include: {
          salesperson: {
            include: {
              company: true,
              faceVideos: { orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] },
            },
          },
        },
        orderBy: { createdAt: "asc" },
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

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const canonicalUrl = `${appUrl}/watch/${video.id}`;

  return (
    <main className="min-h-screen bg-black flex items-center justify-center">
      <div className="relative w-full max-w-sm mx-auto aspect-[9/16] bg-black">
        <WatchOverlay
          videoId={video.id}
          videoTitle={video.title}
          videoUrl={canonicalUrl}
        />
        <CompositePlayer
          platform={video.platform}
          url={video.url}
          preRollUrl={preRollUrl}
          postRollUrl={postRollUrl}
        />
        <VideoFooter
          videoId={video.id}
          title={video.title}
          hashtags={video.videoHashtags.map((vh) => vh.hashtag)}
          salespersonVideo={
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
                    company: primarySalesperson.company,
                  },
                }
              : null
          }
        />
      </div>
    </main>
  );
}
