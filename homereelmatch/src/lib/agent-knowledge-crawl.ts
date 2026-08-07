import { prisma } from "@/lib/prisma";
import { downloadKnowledgeSourceFile } from "@/lib/storage";
import { generateKnowledgeDraftFromSources, type KnowledgeSourceContent } from "@/lib/agent-knowledge";

export class KnowledgeCrawlValidationError extends Error {}

export async function crawlAndRegenerateKnowledgeGroup(
  groupId: string
): Promise<{ entryId: string; status: "DRAFT" }> {
  const group = await prisma.agentKnowledgeSourceGroup.findUnique({
    where: { id: groupId },
    select: {
      id: true,
      topic: true,
      category: true,
      entryId: true,
      sources: {
        select: {
          id: true,
          sourceType: true,
          url: true,
          storagePath: true,
          publicUrl: true,
          fileName: true,
          title: true,
        },
      },
    },
  });
  if (!group) {
    throw new KnowledgeCrawlValidationError("ソースグループが見つかりません");
  }
  if (group.sources.length === 0) {
    throw new KnowledgeCrawlValidationError("ソースが1件も登録されていません");
  }

  const contentSources: KnowledgeSourceContent[] = [];
  for (const s of group.sources) {
    if (s.sourceType === "URL" && s.url) {
      contentSources.push({ type: "url", url: s.url });
    } else if (s.sourceType === "PDF" && s.storagePath) {
      const buffer = await downloadKnowledgeSourceFile(s.storagePath);
      contentSources.push({ type: "pdf", base64: buffer.toString("base64"), filename: s.fileName ?? undefined });
    }
  }

  const draft = await generateKnowledgeDraftFromSources({
    topic: group.topic,
    category: group.category,
    sources: contentSources,
  });

  const citationData = group.sources.map((s) => ({
    url: s.sourceType === "URL" ? (s.url ?? "") : (s.publicUrl ?? s.fileName ?? "PDF"),
    title: s.title ?? s.fileName ?? null,
  }));

  let entryId = group.entryId;
  if (entryId) {
    await prisma.$transaction([
      prisma.agentKnowledgeSource.deleteMany({ where: { entryId } }),
      prisma.agentKnowledgeEntry.update({
        where: { id: entryId },
        data: {
          title: draft.title,
          bodyMarkdown: draft.bodyMarkdown,
          // 再生成のたびに必ずDRAFTへ戻す(公開中でも上書きしない。AI生成物は必ず人間レビューを経る方針)
          status: "DRAFT",
          sources: { create: citationData },
        },
      }),
    ]);
  } else {
    const entry = await prisma.agentKnowledgeEntry.create({
      data: {
        topic: group.topic,
        category: group.category,
        title: draft.title,
        bodyMarkdown: draft.bodyMarkdown,
        status: "DRAFT",
        sources: { create: citationData },
      },
      select: { id: true },
    });
    entryId = entry.id;
    await prisma.agentKnowledgeSourceGroup.update({ where: { id: groupId }, data: { entryId } });
  }

  await prisma.agentKnowledgeSourceGroup.update({
    where: { id: groupId },
    data: { lastCrawledAt: new Date() },
  });

  return { entryId, status: "DRAFT" };
}
