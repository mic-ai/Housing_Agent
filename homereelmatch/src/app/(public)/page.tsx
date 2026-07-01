import { Suspense } from "react";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { SearchBar } from "@/components/search/SearchBar";
import { HashtagCloud } from "@/components/search/HashtagCloud";
import { FilterBar } from "@/components/search/FilterBar";
import { VideoFeedClient } from "@/components/video/VideoFeedClient";
import { mapVideoToDTO } from "@/lib/utils";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "HomeReelMatch | 住宅情報動画 × 営業マンマッチング",
  description:
    "注文住宅・建売・ハウスメーカーの縦型ショート動画を視聴して、あなたに合った住宅営業マンと出会えるマッチングサービスです。",
  alternates: {
    canonical: "/",
  },
};

interface HomePageProps {
  searchParams: Promise<{
    q?: string;
    tag?: string;
    houseMakerId?: string;
    venueId?: string;
  }>;
}

export default async function HomePage({ searchParams }: HomePageProps) {
  const params = await searchParams;

  const where: Record<string, unknown> = { isActive: true };
  if (params.tag) {
    where.videoHashtags = { some: { hashtag: { tagName: params.tag } } };
  }
  if (params.houseMakerId) where.houseMakerId = params.houseMakerId;
  if (params.venueId) where.venueId = params.venueId;
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

  const [initialVideos, houseMakers, venues] = await Promise.all([
    prisma.video.findMany({
      where,
      take: 20,
      orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
      include: {
        videoHashtags: { include: { hashtag: true } },
        salespersonVideos: {
          include: { salesperson: { include: { company: true } } },
        },
        houseMaker: true,
        venue: true,
      },
    }),
    prisma.houseMaker.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.venue.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  return (
    <div className="min-h-screen bg-amber-50 text-stone-800">
      <header className="sticky top-0 z-10 bg-white border-b border-amber-100 shadow-sm px-4 py-3">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center gap-3 mb-3">
            <div className="flex items-center gap-2 shrink-0">
              <div className="w-8 h-8 rounded-lg bg-amber-600 flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" />
                </svg>
              </div>
              <h1 className="text-lg font-bold text-stone-800 tracking-tight">HomeReelMatch</h1>
            </div>
          </div>
          <SearchBar defaultValue={params.q} />
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-4">
        {!params.q && (
          <div className="mb-3 space-y-2">
            <Suspense fallback={null}>
              <HashtagCloud activeTag={params.tag} />
            </Suspense>
            <Suspense fallback={null}>
              <FilterBar
                houseMakers={houseMakers}
                venues={venues}
                activeHouseMakerId={params.houseMakerId}
                activeVenueId={params.venueId}
              />
            </Suspense>
          </div>
        )}

        {params.q && (
          <p className="text-stone-500 text-sm mb-4">
            <span className="text-stone-400">検索:</span>{" "}
            <span className="text-amber-600 font-medium">「{params.q}」</span>
          </p>
        )}

        <VideoFeedClient
          key={`${params.tag ?? ""}_${params.q ?? ""}_${params.houseMakerId ?? ""}_${params.venueId ?? ""}`}
          initialVideos={initialVideos.map(mapVideoToDTO)}
          tag={params.tag}
          q={params.q}
          houseMakerId={params.houseMakerId}
          venueId={params.venueId}
        />
      </main>

      <footer className="border-t border-amber-100 mt-12 py-6 text-center bg-white">
        <p className="text-stone-400 text-xs mb-2">© HomeReelMatch</p>
        <div className="flex items-center justify-center gap-4 text-xs text-stone-400">
          <Link href="/embed-demo" className="hover:text-amber-600 transition-colors">
            ウィジェット埋め込み
          </Link>
          <Link href="/login" className="hover:text-amber-600 transition-colors">
            営業マンログイン
          </Link>
        </div>
      </footer>
    </div>
  );
}
