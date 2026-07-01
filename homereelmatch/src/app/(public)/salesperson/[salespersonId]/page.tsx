import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";

interface Props {
  params: Promise<{ salespersonId: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { salespersonId } = await params;
  const sp = await prisma.salesperson.findUnique({
    where: { id: salespersonId },
    select: { name: true, bio: true, profileImage: true },
  });
  if (!sp) return { title: "営業マンが見つかりません" };
  return {
    title: `${sp.name} | HomeReelMatch`,
    description: sp.bio ?? `${sp.name}のプロフィールページです。`,
    openGraph: {
      title: `${sp.name} | HomeReelMatch`,
      description: sp.bio ?? "",
      images: sp.profileImage ? [sp.profileImage] : [],
    },
  };
}

function PersonIcon() {
  return (
    <svg className="w-16 h-16 text-stone-400" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z" />
    </svg>
  );
}

function LineIcon() {
  return (
    <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.627-.63h2.386c.349 0 .63.285.63.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.627-.63.349 0 .631.285.631.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.281.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314" />
    </svg>
  );
}

function MailIcon() {
  return (
    <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
    </svg>
  );
}

export default async function SalespersonProfilePage({ params }: Props) {
  const { salespersonId } = await params;

  const sp = await prisma.salesperson.findUnique({
    where: { id: salespersonId },
    select: {
      id: true,
      name: true,
      profileImage: true,
      bio: true,
      houseMaker: { select: { id: true, name: true, logoUrl: true } },
      company: { select: { id: true, name: true } },
      videoSegments: {
        where: { video: { isActive: true } },
        orderBy: { createdAt: "asc" },
        take: 6,
        select: {
          video: {
            select: {
              id: true,
              title: true,
              thumbnailUrl: true,
              platform: true,
            },
          },
        },
      },
    },
  });

  if (!sp) notFound();

  return (
    <div className="min-h-screen bg-amber-50 text-stone-800">
      <header className="sticky top-0 z-10 bg-white border-b border-amber-100 shadow-sm px-4 py-3">
        <div className="max-w-lg mx-auto flex items-center gap-3">
          <Link
            href="/"
            className="w-11 h-11 flex items-center justify-center text-stone-500 hover:text-amber-600 hover:bg-amber-50 rounded-full transition-colors"
            aria-label="ホームへ戻る"
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
          <div className="h-20 bg-gradient-to-r from-amber-400 to-amber-600" />
          <div className="px-5 pb-5">
            <div className="flex items-end gap-4 -mt-10 mb-4">
              <div className="w-20 h-20 rounded-full overflow-hidden bg-stone-100 flex-shrink-0 ring-4 ring-white flex items-center justify-center">
                {sp.profileImage ? (
                  <Image
                    src={sp.profileImage}
                    alt={sp.name}
                    width={80}
                    height={80}
                    className="object-cover w-full h-full"
                    priority
                  />
                ) : (
                  <PersonIcon />
                )}
              </div>
              <div className="pb-1 min-w-0">
                <h2 className="text-xl font-bold text-stone-800 leading-tight">{sp.name}</h2>
                {sp.company && (
                  <p className="text-stone-500 text-sm truncate">{sp.company.name}</p>
                )}
              </div>
            </div>

            {sp.houseMaker && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-50 text-amber-700 text-xs font-medium rounded-full border border-amber-200">
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" />
                </svg>
                {sp.houseMaker.name}
              </span>
            )}

            {sp.bio && (
              <p className="mt-3 text-stone-600 text-sm leading-relaxed">{sp.bio}</p>
            )}
          </div>
        </div>

        {/* Videos */}
        {sp.videoSegments.length > 0 && (
          <section className="bg-white rounded-2xl shadow-sm border border-amber-100 p-5">
            <h3 className="text-sm font-semibold text-stone-500 uppercase tracking-wider mb-3">
              担当動画
            </h3>
            <div className="grid grid-cols-3 gap-2">
              {sp.videoSegments.map(({ video }) => (
                <Link
                  key={video.id}
                  href={`/watch/${video.id}`}
                  className="relative aspect-[9/16] rounded-lg overflow-hidden bg-stone-100 block group"
                >
                  {video.thumbnailUrl ? (
                    <Image
                      src={video.thumbnailUrl}
                      alt={video.title}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-200"
                      sizes="(max-width: 640px) 33vw, 150px"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <svg className="w-6 h-6 text-stone-400" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                        <path d="M8 5v14l11-7z" />
                      </svg>
                    </div>
                  )}
                  <div className="absolute inset-0 bg-stone-950/0 group-hover:bg-stone-950/20 transition-colors" />
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Contact buttons */}
        <section className="space-y-3">
          <p className="text-xs text-stone-400 text-center">
            {sp.name}さんに連絡する
          </p>
          <div className="flex gap-3">
            <Link
              href={`/contact/${sp.id}?method=LINE`}
              className="flex-1 flex items-center justify-center gap-2 bg-green-700 hover:bg-green-600 text-white font-medium py-3.5 px-4 rounded-xl transition-colors min-h-[52px]"
            >
              <LineIcon />
              LINEで連絡
            </Link>
            <Link
              href={`/contact/${sp.id}?method=EMAIL`}
              className="flex-1 flex items-center justify-center gap-2 bg-amber-600 hover:bg-amber-500 text-white font-medium py-3.5 px-4 rounded-xl transition-colors min-h-[52px]"
            >
              <MailIcon />
              メールで連絡
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
