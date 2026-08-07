import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin";
import { generateKnowledgeDraft } from "@/lib/agent-knowledge";
import { z } from "zod";

export const maxDuration = 60;

const RequestSchema = z.object({
  topic: z.string().min(1).max(200),
  category: z.string().min(1).max(50),
});

export async function POST(request: NextRequest) {
  const denied = await requireAdmin();
  if (denied) return denied;

  try {
    const body = await request.json();
    const { topic, category } = RequestSchema.parse(body);

    const draft = await generateKnowledgeDraft({ topic, category });

    const entry = await prisma.agentKnowledgeEntry.create({
      data: {
        topic,
        category,
        title: draft.title,
        bodyMarkdown: draft.bodyMarkdown,
        sources: {
          create: draft.sources.map((s) => ({ url: s.url, title: s.title })),
        },
      },
      include: { sources: true },
    });

    return NextResponse.json({ data: entry }, { status: 201 });
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
