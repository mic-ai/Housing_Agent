import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { ArticleViewer } from "@/components/journey/ArticleViewer";

export default async function JourneyArticlePage({
  params,
}: {
  params: Promise<{ phaseKey: string; articleOrder: string }>;
}) {
  const { phaseKey, articleOrder } = await params;
  const order = Number(articleOrder);
  if (!Number.isInteger(order)) notFound();

  const phases = await prisma.learningPhase.findMany({
    where: { isActive: true },
    orderBy: { order: "asc" },
    select: {
      key: true,
      title: true,
      articles: {
        where: { status: "PUBLISHED" },
        orderBy: { order: "asc" },
        select: { id: true, order: true },
      },
    },
  });

  const phaseIndex = phases.findIndex((p) => p.key === phaseKey);
  if (phaseIndex === -1) notFound();
  const phase = phases[phaseIndex];

  const currentIndex = phase.articles.findIndex((a) => a.order === order);
  if (currentIndex === -1) notFound();

  const article = await prisma.article.findUnique({
    where: { id: phase.articles[currentIndex].id },
    select: {
      id: true,
      phaseId: true,
      order: true,
      title: true,
      bodyMarkdown: true,
      estimatedMinutes: true,
      difficulty: true,
      translateBoxLabel: true,
      translateBoxValue: true,
      status: true,
      phase: { select: { id: true, key: true, title: true } },
      comparisonRows: {
        orderBy: { order: "asc" },
        select: {
          id: true,
          priceRangeTag: true,
          featureTag: true,
          order: true,
          houseMaker: { select: { id: true, name: true, logoUrl: true } },
        },
      },
    },
  });
  if (!article || article.status !== "PUBLISHED") notFound();

  const prevArticle = phase.articles[currentIndex - 1] ?? null;
  const nextArticleInPhase = phase.articles[currentIndex + 1] ?? null;

  let nextHref: string;
  let completionMessage: string | null = null;

  if (nextArticleInPhase) {
    nextHref = `/journey/${phase.key}/${nextArticleInPhase.order}`;
  } else {
    const nextPhase = phases[phaseIndex + 1];
    const nextPhaseFirstArticle = nextPhase?.articles[0] ?? null;
    if (nextPhase && nextPhaseFirstArticle) {
      nextHref = `/journey/${nextPhase.key}/${nextPhaseFirstArticle.order}`;
      completionMessage = `${phase.title} 完了！次は${nextPhase.title}へ`;
    } else {
      nextHref = "/";
      completionMessage = `${phase.title} 完了！気になる動画を探してみましょう`;
    }
  }

  return (
    <main className="px-4 py-8">
      <ArticleViewer
        article={article}
        prevHref={prevArticle ? `/journey/${phase.key}/${prevArticle.order}` : null}
        nextHref={nextHref}
        completionMessage={completionMessage}
      />
    </main>
  );
}
