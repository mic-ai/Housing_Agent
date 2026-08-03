import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin";
import { generateArticleDraft } from "@/lib/web-screening";
import { z } from "zod";

const RequestSchema = z.object({
  phaseId: z.string(),
  topic: z.string().min(1).max(200),
});

export async function POST(request: NextRequest) {
  const denied = await requireAdmin();
  if (denied) return denied;

  try {
    const body = await request.json();
    const { phaseId, topic } = RequestSchema.parse(body);

    const phase = await prisma.learningPhase.findUnique({
      where: { id: phaseId },
      select: { id: true, title: true },
    });
    if (!phase) {
      return NextResponse.json({ error: "Not Found" }, { status: 404 });
    }

    const draft = await generateArticleDraft({ phaseTitle: phase.title, topic });
    const articleCount = await prisma.article.count({ where: { phaseId } });

    const article = await prisma.article.create({
      data: {
        phaseId,
        order: articleCount,
        title: draft.title,
        bodyMarkdown: draft.bodyMarkdown,
        estimatedMinutes: draft.estimatedMinutes,
        difficulty: draft.difficulty,
        sources: {
          create: draft.sources.map((s) => ({ url: s.url, title: s.title })),
        },
      },
      include: { comparisonRows: true, sources: true },
    });

    return NextResponse.json({ data: article }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    console.error(error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal Server Error" },
      { status: 500 }
    );
  }
}
