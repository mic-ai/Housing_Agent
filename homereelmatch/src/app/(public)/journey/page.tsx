import { prisma } from "@/lib/prisma";
import { getViewerToken } from "@/lib/viewer";
import { PhaseTimeline, type PhaseTimelineItem } from "@/components/journey/PhaseTimeline";

export default async function JourneyPage() {
  const phases = await prisma.learningPhase.findMany({
    where: { isActive: true },
    orderBy: { order: "asc" },
    select: {
      id: true,
      key: true,
      title: true,
      description: true,
      articles: {
        where: { status: "PUBLISHED" },
        orderBy: { order: "asc" },
        select: { id: true, order: true },
      },
    },
  });

  const viewerToken = await getViewerToken();
  let completedArticleIds = new Set<string>();
  if (viewerToken) {
    const viewer = await prisma.viewerProfile.findUnique({
      where: { viewerToken },
      select: {
        articleProgress: {
          where: { completedAt: { not: null } },
          select: { articleId: true },
        },
      },
    });
    completedArticleIds = new Set(viewer?.articleProgress.map((p) => p.articleId) ?? []);
  }

  const items: PhaseTimelineItem[] = phases.map((phase) => {
    const totalArticles = phase.articles.length;
    const completedCount = phase.articles.filter((a) => completedArticleIds.has(a.id)).length;
    const nextArticle = phase.articles.find((a) => !completedArticleIds.has(a.id)) ?? phase.articles[0] ?? null;
    return {
      id: phase.id,
      key: phase.key,
      title: phase.title,
      description: phase.description,
      totalArticles,
      completedCount,
      nextArticleOrder: nextArticle?.order ?? null,
    };
  });

  return (
    <main className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-stone-900 mb-1">マイ家づくり</h1>
      <p className="text-sm text-stone-500 mb-8">あなたのペースで、住宅づくりの基礎を学びましょう</p>
      <PhaseTimeline phases={items} />
    </main>
  );
}
