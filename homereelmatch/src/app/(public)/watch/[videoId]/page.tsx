import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { CompositePlayer } from "@/components/video/CompositePlayer";
import { VideoFooter } from "@/components/video/VideoFooter";
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
        where: { isPrimary: true },
        include: { salesperson: { include: { company: true } } },
        take: 1,
      },
    },
  });

  if (!video) notFound();

  const primarySalespersonVideo = video.salespersonVideos[0] ?? null;

  return (
    <main className="min-h-screen bg-black flex items-center justify-center">
      <div className="relative w-full max-w-sm mx-auto aspect-[9/16] bg-black">
        <CompositePlayer
          platform={video.platform}
          url={video.url}
          preRollUrl={primarySalespersonVideo?.preRollPublicUrl}
          postRollUrl={primarySalespersonVideo?.postRollPublicUrl}
        />
        <VideoFooter
          videoId={video.id}
          title={video.title}
          hashtags={video.videoHashtags.map((vh) => vh.hashtag)}
          salespersonVideo={
            primarySalespersonVideo
              ? {
                  id: primarySalespersonVideo.id,
                  salespersonId: primarySalespersonVideo.salespersonId,
                  preRollPublicUrl: primarySalespersonVideo.preRollPublicUrl,
                  preRollDurationSec: primarySalespersonVideo.preRollDurationSec,
                  postRollPublicUrl: primarySalespersonVideo.postRollPublicUrl,
                  postRollDurationSec: primarySalespersonVideo.postRollDurationSec,
                  isPrimary: primarySalespersonVideo.isPrimary,
                  salesperson: {
                    id: primarySalespersonVideo.salesperson.id,
                    name: primarySalespersonVideo.salesperson.name,
                    profileImage: primarySalespersonVideo.salesperson.profileImage,
                    bio: primarySalespersonVideo.salesperson.bio,
                    company: primarySalespersonVideo.salesperson.company,
                  },
                }
              : null
          }
        />
      </div>
    </main>
  );
}
