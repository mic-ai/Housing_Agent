import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getViewerToken, ensureViewerProfile } from "@/lib/viewer";

const BodySchema = z.object({
  articleId: z.string(),
});

export async function POST(request: NextRequest) {
  try {
    const body = BodySchema.parse(await request.json());
    const viewerToken = await getViewerToken();
    if (!viewerToken) {
      return NextResponse.json({ error: "viewerToken cookie is missing" }, { status: 400 });
    }

    const article = await prisma.article.findUnique({
      where: { id: body.articleId },
      select: { id: true, status: true },
    });
    if (!article || article.status !== "PUBLISHED") {
      return NextResponse.json({ error: "Not Found" }, { status: 404 });
    }

    const viewer = await ensureViewerProfile(viewerToken);
    const progress = await prisma.viewerArticleProgress.upsert({
      where: { viewerId_articleId: { viewerId: viewer.id, articleId: article.id } },
      update: { completedAt: new Date() },
      create: { viewerId: viewer.id, articleId: article.id, completedAt: new Date() },
    });

    return NextResponse.json({ data: progress });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    console.error(error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
