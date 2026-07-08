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

  const phase = await prisma.learningPhase.findUnique({
    where: { key: phaseKey },
    select: {
      key: true,
      articles: {
        where: { status: "PUBLISHED" },
        orderBy: { order: "asc" },
        select: { id: true, order: true },
      },
    },
  });
  if (!phase) notFound();

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
  const nextArticle = phase.articles[currentIndex + 1] ?? null;

  return (
    <main className="px-4 py-8">
      <ArticleViewer
        article={article}
        prevHref={prevArticle ? `/journey/${phase.key}/${prevArticle.order}` : null}
        nextHref={nextArticle ? `/journey/${phase.key}/${nextArticle.order}` : null}
      />
    </main>
  );
}
