import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getViewerToken } from "@/lib/viewer";
import { ViewedSalespersonList } from "@/components/consult/ViewedSalespersonList";
import { CandidateSalespersonRow } from "@/components/consult/CandidateSalespersonRow";

export default async function ConsultPage() {
  const viewerToken = await getViewerToken();
  const viewer = viewerToken
    ? await prisma.viewerProfile.findUnique({ where: { viewerToken } })
    : null;

  const viewedList = viewer
    ? await prisma.viewerSalespersonView.findMany({
        where: { viewerId: viewer.id },
        orderBy: { lastViewedAt: "desc" },
        select: {
          id: true,
          videoId: true,
          viewCount: true,
          salesperson: {
            select: {
              id: true,
              name: true,
              profileImage: true,
              toneQuote: true,
              company: { select: { id: true, name: true } },
            },
          },
        },
      })
    : [];

  const viewedSalespersonIds = viewedList.map((v) => v.salesperson.id);

  const savedMakers = viewer
    ? await prisma.viewerSavedMaker.findMany({
        where: { viewerId: viewer.id },
        select: { houseMakerId: true },
      })
    : [];
  const savedMakerIds = savedMakers.map((m) => m.houseMakerId);

  const candidates =
    savedMakerIds.length > 0
      ? await prisma.salesperson.findMany({
          where: {
            houseMakerId: { in: savedMakerIds },
            ...(viewedSalespersonIds.length > 0 ? { id: { notIn: viewedSalespersonIds } } : {}),
          },
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            name: true,
            profileImage: true,
            toneQuote: true,
            houseMaker: { select: { id: true, name: true } },
          },
        })
      : [];

  return (
    <div className="min-h-screen bg-amber-50 text-stone-800">
      <header className="sticky top-0 z-10 bg-white border-b border-amber-100 shadow-sm px-4 py-3">
        <div className="max-w-lg mx-auto flex items-center gap-3">
          <Link
            href="/"
            className="w-11 h-11 flex items-center justify-center text-stone-500 hover:text-amber-600 hover:bg-amber-50 rounded-full transition-colors"
            aria-label="戻る"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <h1 className="text-lg font-bold text-stone-800">担当に相談する</h1>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-6 space-y-6">
        <section className="bg-white rounded-2xl shadow-sm border border-amber-100 p-5">
          <h2 className="text-base font-bold text-stone-800 mb-2">相談は気軽に</h2>
          <ul className="text-sm text-stone-600 space-y-1 leading-relaxed">
            <li>・相談は無料です</li>
            <li>・契約の約束をするものではありません</li>
            <li>・気になる担当に気軽に連絡してみましょう</li>
          </ul>
        </section>

        <section>
          <h3 className="text-sm font-semibold text-stone-500 uppercase tracking-wider mb-3">
            これまで見た営業担当
          </h3>
          <ViewedSalespersonList items={viewedList} />
        </section>

        <section>
          <h3 className="text-sm font-semibold text-stone-500 uppercase tracking-wider mb-3">
            気になるメーカーの他の担当
          </h3>
          {candidates.length === 0 ? (
            <div className="bg-white rounded-2xl border border-amber-100 p-5 text-center">
              <p className="text-stone-500 text-sm mb-3">気になるメーカーがまだ登録されていません</p>
              <Link href="/" className="text-amber-600 text-sm font-medium hover:text-amber-700">
                動画を見てみる →
              </Link>
            </div>
          ) : (
            <div className="space-y-2">
              {candidates.map((c) => (
                <CandidateSalespersonRow key={c.id} salesperson={c} />
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
