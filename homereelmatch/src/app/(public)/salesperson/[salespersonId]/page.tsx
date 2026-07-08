import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { ContactForm } from "@/components/contact/ContactForm";
import { IntroVideoPlayer } from "@/components/video/IntroVideoPlayer";
import { extractYouTubeId, getYouTubeThumbnail } from "@/lib/utils";
import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import type { Platform } from "@/types";

interface Props {
  params: Promise<{ salespersonId: string }>;
  searchParams: Promise<{ videoId?: string; method?: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { salespersonId } = await params;
  const sp = await prisma.salesperson.findUnique({
    where: { id: salespersonId },
    select: { name: true, toneQuote: true, profileImage: true },
  });
  if (!sp) return { title: "営業マンが見つかりません" };
  return {
    title: `${sp.name} | HomeReelMatch`,
    description: sp.toneQuote ?? `${sp.name}のプロフィールページです。`,
    openGraph: {
      title: `${sp.name} | HomeReelMatch`,
      description: sp.toneQuote ?? "",
      images: sp.profileImage ? [sp.profileImage] : [],
    },
  };
}

function PersonIcon() {
  return (
    <svg className="w-32 h-32 text-stone-400" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z" />
    </svg>
  );
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="bg-white rounded-2xl shadow-sm border border-amber-100 p-5">
      <h3 className="text-sm font-semibold text-stone-500 uppercase tracking-wider mb-3">{title}</h3>
      {children}
    </section>
  );
}

function VideoGridItem({
  video,
}: {
  video: { id: string; title: string; thumbnailUrl: string | null; platform: Platform; url: string };
}) {
  const ytId = video.platform === "YOUTUBE" ? extractYouTubeId(video.url) : null;
  const thumb = video.thumbnailUrl ?? (ytId ? getYouTubeThumbnail(ytId) : null);

  return (
    <Link
      href={`/watch/${video.id}`}
      className="relative block rounded-lg overflow-hidden bg-stone-100 aspect-[9/16]"
    >
      {thumb ? (
        <Image src={thumb} alt={video.title} fill sizes="200px" className="object-cover" />
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-stone-200 text-stone-500 text-xs p-2 text-center">
          {video.title}
        </div>
      )}
    </Link>
  );
}

export default async function SalespersonProfilePage({ params, searchParams }: Props) {
  const { salespersonId } = await params;
  const sp2 = await searchParams;
  const defaultMethod = sp2.method === "EMAIL" ? "EMAIL" : "LINE";

  const sp = await prisma.salesperson.findUnique({
    where: { id: salespersonId },
    select: {
      id: true,
      name: true,
      profileImage: true,
      profileDetail: true,
      toneQuote: true,
      yearsExperience: true,
      handoverCount: true,
      introVideoUrl: true,
      houseMaker: { select: { id: true, name: true, logoUrl: true } },
      company: { select: { id: true, name: true } },
      videoSegments: {
        orderBy: { createdAt: "desc" },
        select: {
          video: {
            select: {
              id: true,
              title: true,
              thumbnailUrl: true,
              platform: true,
              url: true,
              videoHashtags: { select: { hashtag: { select: { tagName: true } } } },
            },
          },
        },
      },
    },
  });

  if (!sp) notFound();

  const featuredVideos = sp.videoSegments.slice(0, 6).map((vs) => vs.video);
  const hasMoreVideos = sp.videoSegments.length > 6;
  const specialtyTags = Array.from(
    new Set(sp.videoSegments.flatMap((vs) => vs.video.videoHashtags.map((vh) => vh.hashtag.tagName)))
  ).slice(0, 8);
  const hasCareerSummary = sp.yearsExperience !== null || sp.handoverCount !== null || specialtyTags.length > 0;

  return (
    <div className="min-h-screen bg-amber-50 text-stone-800">
      <header className="sticky top-0 z-10 bg-white border-b border-amber-100 shadow-sm px-4 py-3">
        <div className="max-w-lg mx-auto flex items-center gap-3">
          <Link
            href={sp2.videoId ? `/watch/${sp2.videoId}` : "/"}
            className="w-11 h-11 flex items-center justify-center text-stone-500 hover:text-amber-600 hover:bg-amber-50 rounded-full transition-colors"
            aria-label="戻る"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <h1 className="text-lg font-bold text-stone-800">営業マンプロフィール</h1>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-6 space-y-5">
        {/* Hero card */}
        <div className="bg-white rounded-2xl shadow-sm border border-amber-100 overflow-hidden">
          <div className="h-32 bg-gradient-to-r from-amber-400 to-amber-600" />
          <div className="px-5 pb-5 flex flex-col items-center text-center">
            <div className="w-60 h-60 rounded-full overflow-hidden bg-stone-100 flex-shrink-0 ring-4 ring-white -mt-28 mb-4 flex items-center justify-center">
              {sp.profileImage ? (
                <Image
                  src={sp.profileImage}
                  alt={sp.name}
                  width={240}
                  height={240}
                  className="object-cover w-full h-full"
                  priority
                />
              ) : (
                <PersonIcon />
              )}
            </div>

            <h2 className="text-xl font-bold text-stone-800 leading-tight">{sp.name}</h2>
            {sp.company && (
              <p className="text-stone-500 text-sm truncate">{sp.company.name}</p>
            )}

            {sp.houseMaker && (
              <span className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 bg-amber-50 text-amber-700 text-xs font-medium rounded-full border border-amber-200">
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" />
                </svg>
                {sp.houseMaker.name}
              </span>
            )}

            {sp.toneQuote && (
              <blockquote className="mt-4 text-stone-700 text-sm font-medium italic border-l-4 border-amber-300 pl-3 text-left self-stretch">
                「{sp.toneQuote}」
              </blockquote>
            )}
          </div>
        </div>

        {/* 自己紹介動画 */}
        {sp.introVideoUrl && (
          <SectionCard title="自己紹介動画">
            <IntroVideoPlayer url={sp.introVideoUrl} />
          </SectionCard>
        )}

        {/* Detailed profile */}
        {sp.profileDetail && (
          <SectionCard title="詳細プロフィール（家づくりで大切にしていること）">
            <p className="text-stone-600 text-sm leading-relaxed whitespace-pre-wrap">{sp.profileDetail}</p>
          </SectionCard>
        )}

        {/* この担当が紹介した住宅 */}
        {featuredVideos.length > 0 && (
          <SectionCard title="この担当が紹介した住宅">
            <div className="grid grid-cols-3 gap-2">
              {featuredVideos.map((video) => (
                <VideoGridItem key={video.id} video={video} />
              ))}
            </div>
            {hasMoreVideos && (
              <Link
                href={`/?salespersonId=${sp.id}`}
                className="mt-3 inline-block text-sm font-medium text-amber-600 hover:text-amber-700"
              >
                すべて見る →
              </Link>
            )}
          </SectionCard>
        )}

        {/* 経歴サマリー */}
        {hasCareerSummary && (
          <SectionCard title="経歴サマリー">
            <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-stone-600">
              {sp.yearsExperience !== null && (
                <p>
                  経験年数 <span className="font-semibold text-stone-800">{sp.yearsExperience}年</span>
                </p>
              )}
              {sp.handoverCount !== null && (
                <p>
                  引き渡し棟数 <span className="font-semibold text-stone-800">{sp.handoverCount}棟</span>
                </p>
              )}
            </div>
            {specialtyTags.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {specialtyTags.map((tag) => (
                  <span
                    key={tag}
                    className="px-2.5 py-1 bg-amber-50 text-amber-700 text-xs font-medium rounded-full border border-amber-200"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            )}
          </SectionCard>
        )}

        {/* Contact form */}
        <section id="contact" className="bg-white rounded-2xl shadow-sm border border-amber-100 p-5 scroll-mt-20">
          <h3 className="text-sm font-semibold text-stone-500 uppercase tracking-wider mb-1">
            連絡する
          </h3>
          <p className="text-xs text-stone-400 mb-4">{sp.name}さんに直接連絡できます</p>
          <ContactForm
            salespersonId={sp.id}
            videoId={sp2.videoId}
            defaultMethod={defaultMethod as "LINE" | "EMAIL"}
          />
        </section>
      </main>
    </div>
  );
}
