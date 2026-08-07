import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin";
import { crawlAndRegenerateKnowledgeGroup, KnowledgeCrawlValidationError } from "@/lib/agent-knowledge-crawl";

export const maxDuration = 120;

type Params = { params: Promise<{ groupId: string }> };

export async function POST(_request: NextRequest, { params }: Params): Promise<NextResponse> {
  const denied = await requireAdmin();
  if (denied) return denied;

  try {
    const { groupId } = await params;
    const exists = await prisma.agentKnowledgeSourceGroup.findUnique({
      where: { id: groupId },
      select: { id: true },
    });
    if (!exists) {
      return NextResponse.json({ error: "Not Found" }, { status: 404 });
    }

    const result = await crawlAndRegenerateKnowledgeGroup(groupId);
    return NextResponse.json({ data: result });
  } catch (error) {
    if (error instanceof KnowledgeCrawlValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error(error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal Server Error" },
      { status: 500 }
    );
  }
}
