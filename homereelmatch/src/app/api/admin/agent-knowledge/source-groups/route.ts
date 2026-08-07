import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin";
import { z } from "zod";
import type { AgentKnowledgeSourceGroupListItemDTO } from "@/types";

const CreateGroupSchema = z.object({
  topic: z.string().min(1).max(200),
  category: z.string().min(1).max(50),
});

export async function GET() {
  const denied = await requireAdmin();
  if (denied) return denied;

  const groups = await prisma.agentKnowledgeSourceGroup.findMany({
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      topic: true,
      category: true,
      lastCrawledAt: true,
      createdAt: true,
      entry: { select: { id: true, status: true } },
      _count: { select: { sources: true } },
    },
  });

  const data: AgentKnowledgeSourceGroupListItemDTO[] = groups.map((g) => ({
    id: g.id,
    topic: g.topic,
    category: g.category,
    sourceCount: g._count.sources,
    lastCrawledAt: g.lastCrawledAt ? g.lastCrawledAt.toISOString() : null,
    entry: g.entry ? { id: g.entry.id, status: g.entry.status } : null,
    createdAt: g.createdAt.toISOString(),
  }));

  return NextResponse.json({ data });
}

export async function POST(request: NextRequest) {
  const denied = await requireAdmin();
  if (denied) return denied;

  try {
    const body = CreateGroupSchema.parse(await request.json());
    const group = await prisma.agentKnowledgeSourceGroup.create({ data: body });
    return NextResponse.json({ data: group }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    console.error(error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
