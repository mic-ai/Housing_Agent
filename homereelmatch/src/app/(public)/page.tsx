import { Suspense } from "react";
import { prisma } from "@/lib/prisma";
import { SearchBar } from "@/components/search/SearchBar";
import { HashtagCloud } from "@/components/search/HashtagCloud";
import { VideoFeedClient } from "@/components/video/VideoFeedClient";
import { mapVideoToDTO } from "@/lib/utils";

interface HomePageProps {
  searchParams: Promise<{ q?: string; tag?: string }>;
}

export default async function HomePage({ searchParams }: HomePageProps) {
  const params = await searchParams;

  const where: Record<string, unknown> = { isActive: true };
  if (params.tag) {
    where.videoHashtags = { some: { hashtag: { tagName: params.tag } } };
  }
  if (params.q) {
    where.OR = [
      { title: { contains: params.q, mode: "insensitive" } },
      {
        videoHashtags: {
          some: {
            hashtag: { tagName: { contains: params.q, mode: "insensitive" } },
          },
        },
      },
    ];
  }

  const initialVideos = await prisma.video.findMany({
    where,
    take: 20,
    orderBy: { createdAt: "desc" },
    include: {
      videoHashtags: { include: { hashtag: true } },
      salespersonVideos: {
        include: { salesperson: { include: { company: true } } },
      },
      houseMaker: true,
      venue: true,
    },
  });

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <header className="sticky top-0 z-10 bg-gray-950/90 backdrop-blur-sm border-b border-white/10 px-4 py-3">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center gap-3 mb-3">
            <h1 className="text-xl font-bold text-white shrink-0">HomeReelMatch</h1>
          </div>
          <SearchBar defaultValue={params.q} />
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-4">
        {!params.q && !params.tag && (
          <div className="mb-4">
            <Suspense fallback={null}>
              <HashtagCloud />
            </Suspense>
          </div>
        )}

        {params.tag && (
          <p className="text-gray-400 text-sm mb-4">
            #{params.tag} の動画
          </p>
        )}
        {params.q && (
          <p className="text-gray-400 text-sm mb-4">
            「{params.q}」の検索結果
          </p>
        )}

        <VideoFeedClient
          initialVideos={initialVideos.map(mapVideoToDTO)}
          tag={params.tag}
          q={params.q}
        />
      </main>
    </div>
  );
}
