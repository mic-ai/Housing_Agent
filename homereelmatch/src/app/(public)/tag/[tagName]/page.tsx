import { prisma } from "@/lib/prisma";
import { VideoCard } from "@/components/video/VideoCard";
import Link from "next/link";
import type { Metadata } from "next";
import { mapVideoToDTO } from "@/lib/utils";

interface TagPageProps {
  params: Promise<{ tagName: string }>;
}

export async function generateMetadata({ params }: TagPageProps): Promise<Metadata> {
  const { tagName } = await params;
  return { title: `#${decodeURIComponent(tagName)} の動画 | HomeReelMatch` };
}

export default async function TagPage({ params }: TagPageProps) {
  const { tagName } = await params;
  const decoded = decodeURIComponent(tagName);

  const videos = await prisma.video.findMany({
    where: {
      isActive: true,
      videoHashtags: { some: { hashtag: { tagName: decoded } } },
    },
    take: 40,
    orderBy: { createdAt: "desc" },
    include: {
      houseMaker: true,
      venue: true,
      videoHashtags: { include: { hashtag: true } },
      salespersonVideos: {
        include: { salesperson: { include: { company: true } } },
      },
    },
  });

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <header className="sticky top-0 z-10 bg-gray-950/90 backdrop-blur-sm border-b border-white/10 px-4 py-3">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <Link href="/" className="text-gray-400 hover:text-white">&#8592;</Link>
          <h1 className="text-lg font-bold">#{decoded}</h1>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-4">
        {videos.length === 0 ? (
          <p className="text-center text-gray-500 py-16">動画がありません</p>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {videos.map((video) => (
              <VideoCard key={video.id} video={mapVideoToDTO(video)} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
