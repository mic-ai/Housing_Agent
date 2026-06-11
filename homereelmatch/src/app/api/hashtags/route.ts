import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const QuerySchema = z.object({
  q: z.string().optional(),
  limit: z.coerce.number().min(1).max(100).default(30),
});

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const query = QuerySchema.parse(Object.fromEntries(searchParams));

    const hashtags = await prisma.hashtag.findMany({
      where: query.q
        ? { tagName: { contains: query.q, mode: "insensitive" } }
        : undefined,
      orderBy: { usageCount: "desc" },
      take: query.limit,
    });

    return NextResponse.json({ data: hashtags });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    console.error(error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
