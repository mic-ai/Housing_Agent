import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const QuerySchema = z.object({
  phaseKey: z.string(),
});

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const query = QuerySchema.parse(Object.fromEntries(searchParams));

    const articles = await prisma.article.findMany({
      where: { status: "PUBLISHED", phase: { key: query.phaseKey, isActive: true } },
      orderBy: { order: "asc" },
      select: {
        id: true,
        order: true,
        title: true,
        estimatedMinutes: true,
        difficulty: true,
      },
    });

    return NextResponse.json({ data: articles });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    console.error(error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
