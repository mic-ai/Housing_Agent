import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ articleId: string }> }
) {
  try {
    const { articleId } = await params;
    const article = await prisma.article.findUnique({
      where: { id: articleId },
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

    if (!article || article.status !== "PUBLISHED") {
      return NextResponse.json({ error: "Not Found" }, { status: 404 });
    }

    return NextResponse.json({ data: article });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
