import Link from "next/link";

export interface PhaseTimelineItem {
  id: string;
  key: string;
  title: string;
  description: string | null;
  totalArticles: number;
  completedCount: number;
  nextArticleOrder: number | null;
}

export function PhaseTimeline({ phases }: { phases: PhaseTimelineItem[] }) {
  if (phases.length === 0) {
    return <p className="text-sm text-stone-500 text-center py-12">学習コンテンツは準備中です</p>;
  }

  return (
    <ol className="relative border-l-2 border-stone-200 space-y-8 pl-6">
      {phases.map((phase) => {
        const isCompleted = phase.totalArticles > 0 && phase.completedCount === phase.totalArticles;
        return (
          <li key={phase.id} className="relative">
            <span
              className={`absolute -left-[31px] top-0.5 w-4 h-4 rounded-full border-2 ${
                isCompleted ? "bg-amber-600 border-amber-600" : "bg-white border-stone-300"
              }`}
            />
            <div
              className={`rounded-xl border p-4 ${
                isCompleted ? "border-stone-200 bg-stone-50" : "border-amber-200 bg-white shadow-sm"
              }`}
            >
              <div className="flex items-center justify-between">
                <h2 className="font-semibold text-stone-900">{phase.title}</h2>
                <span className="text-xs text-stone-500">
                  {phase.completedCount}/{phase.totalArticles}
                </span>
              </div>
              {phase.description && !isCompleted && (
                <p className="text-sm text-stone-600 mt-1">{phase.description}</p>
              )}
              {phase.totalArticles === 0 ? (
                <p className="text-xs text-stone-400 mt-3">記事は準備中です</p>
              ) : phase.nextArticleOrder !== null ? (
                <Link
                  href={`/journey/${phase.key}/${phase.nextArticleOrder}`}
                  className="inline-block mt-3 text-sm font-medium text-amber-700 hover:text-amber-800"
                >
                  {isCompleted ? "もう一度読む →" : "次の記事へ →"}
                </Link>
              ) : null}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
