import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin";
import { deleteKnowledgeSourceFile } from "@/lib/storage";
import type { AgentKnowledgeSourceGroupDetailDTO } from "@/types";

type Params = { params: Promise<{ groupId: string }> };

export async function GET(_request: NextRequest, { params }: Params): Promise<NextResponse> {
  const denied = await requireAdmin();
  if (denied) return denied;

  const { groupId } = await params;
  const group = await prisma.agentKnowledgeSourceGroup.findUnique({
    where: { id: groupId },
    select: {
      id: true,
      topic: true,
      category: true,
      lastCrawledAt: true,
      createdAt: true,
      entry: { select: { id: true, status: true } },
      sources: {
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          sourceType: true,
          url: true,
          publicUrl: true,
          fileName: true,
          title: true,
          createdAt: true,
        },
      },
    },
  });
  if (!group) {
    return NextResponse.json({ error: "Not Found" }, { status: 404 });
  }

  const data: AgentKnowledgeSourceGroupDetailDTO = {
    id: group.id,
    topic: group.topic,
    category: group.category,
    sourceCount: group.sources.length,
    lastCrawledAt: group.lastCrawledAt ? group.lastCrawledAt.toISOString() : null,
    entry: group.entry ? { id: group.entry.id, status: group.entry.status } : null,
    createdAt: group.createdAt.toISOString(),
    sources: group.sources.map((s) => ({
      id: s.id,
      sourceType: s.sourceType,
      url: s.url,
      publicUrl: s.publicUrl,
      fileName: s.fileName,
      title: s.title,
      createdAt: s.createdAt.toISOString(),
    })),
  };

  return NextResponse.json({ data });
}

export async function DELETE(_request: NextRequest, { params }: Params): Promise<NextResponse> {
  const denied = await requireAdmin();
  if (denied) return denied;

  try {
    const { groupId } = await params;
    const group = await prisma.agentKnowledgeSourceGroup.findUnique({
      where: { id: groupId },
      select: { id: true, sources: { select: { sourceType: true, storagePath: true } } },
    });
    if (!group) {
      return NextResponse.json({ error: "Not Found" }, { status: 404 });
    }

    for (const source of group.sources) {
      if (source.sourceType === "PDF" && source.storagePath) {
        await deleteKnowledgeSourceFile(source.storagePath);
      }
    }

    await prisma.agentKnowledgeSourceGroup.delete({ where: { id: groupId } });
    return NextResponse.json({ data: { id: groupId } });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
