import { cache } from "react";
import { prisma } from "@/lib/prisma";
import { getViewerToken } from "@/lib/viewer";

export type JourneyStageStatus = "done" | "current" | "upcoming";

export interface JourneyStageItem {
  key: string;
  label: string;
  status: JourneyStageStatus;
  href: string;
  progressLabel: string | null;
}

export interface JourneyOverview {
  stages: JourneyStageItem[];
  hasAnyProgress: boolean;
}

export const getJourneyOverview = cache(async (): Promise<JourneyOverview> => {
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

  const viewerToken = await getViewerToken();
  let completedArticleIds = new Set<string>();
  let hasSalespersonView = false;

  if (viewerToken) {
    const viewer = await prisma.viewerProfile.findUnique({
      where: { viewerToken },
      select: {
        id: true,
        articleProgress: { where: { completedAt: { not: null } }, select: { articleId: true } },
      },
    });
    if (viewer) {
      completedArticleIds = new Set(viewer.articleProgress.map((p) => p.articleId));
      hasSalespersonView =
        (await prisma.viewerSalespersonView.count({ where: { viewerId: viewer.id } })) > 0;
    }
  }

  const phaseStages = phases.map((phase) => {
    const total = phase.articles.length;
    const completedCount = phase.articles.filter((a) => completedArticleIds.has(a.id)).length;
    const done = total > 0 && completedCount === total;
    const nextArticle = phase.articles.find((a) => !completedArticleIds.has(a.id)) ?? phase.articles[0] ?? null;
    return {
      key: phase.key,
      title: phase.title,
      done,
      progressLabel: total > 0 ? `${completedCount}/${total}` : null,
      href: nextArticle ? `/journey/${phase.key}/${nextArticle.order}` : "/journey",
    };
  });

  const firstIncompleteIndex = phaseStages.findIndex((p) => !p.done);
  const allPhasesDone = phaseStages.length > 0 && firstIncompleteIndex === -1;

  const stages: JourneyStageItem[] = phaseStages.map((phase, index) => ({
    key: phase.key,
    label: phase.title,
    status: phase.done ? "done" : index === firstIncompleteIndex ? "current" : "upcoming",
    href: phase.href,
    progressLabel: phase.progressLabel,
  }));

  stages.push({
    key: "video",
    label: "動画で比較",
    status: allPhasesDone ? (hasSalespersonView ? "done" : "current") : "upcoming",
    href: "/",
    progressLabel: null,
  });

  stages.push({
    key: "contact",
    label: "担当に相談",
    status: hasSalespersonView ? "current" : "upcoming",
    href: "/consult",
    progressLabel: null,
  });

  const hasAnyProgress = completedArticleIds.size > 0 || hasSalespersonView;

  return { stages, hasAnyProgress };
});
