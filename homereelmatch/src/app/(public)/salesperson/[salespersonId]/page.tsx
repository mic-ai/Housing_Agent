import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { ContactForm } from "@/components/contact/ContactForm";
import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";

interface Props {
  params: Promise<{ salespersonId: string }>;
  searchParams: Promise<{ videoId?: string; method?: string }>;
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
      bio: true,
      profileDetail: true,
      houseMaker: { select: { id: true, name: true, logoUrl: true } },
      company: { select: { id: true, name: true } },
    },
  });

  if (!sp) notFound();

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

        {/* Detailed profile */}
        {sp.profileDetail && (
          <section className="bg-white rounded-2xl shadow-sm border border-amber-100 p-5">
            <h3 className="text-sm font-semibold text-stone-500 uppercase tracking-wider mb-3">
              詳細プロフィール
            </h3>
            <p className="text-stone-600 text-sm leading-relaxed whitespace-pre-wrap">
              {sp.profileDetail}
            </p>
          </section>
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
