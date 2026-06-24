import { prisma } from "@/lib/prisma";
import { VideoCard } from "@/components/video/VideoCard";
import Link from "next/link";
import type { Metadata } from "next";
import { mapVideoToDTO } from "@/lib/utils";
import { Breadcrumb } from "@/components/ui/Breadcrumb";

interface TagPageProps {
  params: Promise<{ tagName: string }>;
}

export async function generateMetadata({ params }: TagPageProps): Promise<Metadata> {
  const { tagName } = await params;
  const decoded = decodeURIComponent(tagName);
  return {
    title: `#${decoded} の住宅動画`,
    description: `「${decoded}」に関する住宅情報の縦型ショート動画一覧。HomeReelMatchで営業マンとマッチングしよう。`,
    keywords: [decoded, "住宅", "注文住宅", "動画"],
    alternates: {
      canonical: `/tag/${encodeURIComponent(decoded)}`,
    },
    openGraph: {
      title: `#${decoded} の住宅動画 | HomeReelMatch`,
      description: `「${decoded}」に関する住宅情報の縦型ショート動画一覧`,
    },
  };
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

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://homereelmatch.vercel.app";

  return (
    <div className="min-h-screen bg-stone-950 text-white">
      <header className="sticky top-0 z-10 bg-stone-950/90 backdrop-blur-sm border-b border-white/10 px-4 py-3">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <Link
            href="/"
            aria-label="ホームに戻る"
            className="text-stone-400 hover:text-white p-1"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <h1 className="text-lg font-bold">#{decoded}</h1>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-4">
        <div className="mb-4">
          <Breadcrumb
            appUrl={appUrl}
            items={[
              { name: "ホーム", href: "/" },
              { name: `#${decoded}` },
            ]}
          />
          <p className="mt-2 text-stone-400 text-xs">
            {videos.length}件の動画
          </p>
        </div>

        {videos.length === 0 ? (
          <p className="text-center text-stone-500 py-16">動画がありません</p>
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
