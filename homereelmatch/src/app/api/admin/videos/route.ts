import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const ListQuerySchema = z.object({
  isActive: z.enum(["true", "false"]).transform((v) => v === "true").optional(),
  limit: z.coerce.number().default(50),
});

const BulkPatchSchema = z.object({
  ids: z.array(z.string()).min(1, "ids must not be empty"),
  isActive: z.boolean(),
});

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = request.nextUrl;
    const query = ListQuerySchema.parse(Object.fromEntries(searchParams));

    const videos = await prisma.video.findMany({
      where: query.isActive !== undefined ? { isActive: query.isActive } : undefined,
      include: {
        videoHashtags: { include: { hashtag: true } },
        salespersonVideos: { select: { id: true } },
      },
      orderBy: { createdAt: "desc" },
      take: query.limit,
    });

    const data = videos.map((v) => ({
      id: v.id,
      platform: v.platform,
      url: v.url,
      thumbnailUrl: v.thumbnailUrl,
      title: v.title,
      viewCount: v.viewCount,
      isActive: v.isActive,
      hashtags: v.videoHashtags.map((vh) => vh.hashtag.tagName),
      salespersonCount: v.salespersonVideos.length,
      createdAt: v.createdAt.toISOString(),
    }));

    return NextResponse.json({ data });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    console.error(error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json();
    const data = BulkPatchSchema.parse(body);

    const result = await prisma.video.updateMany({
      where: { id: { in: data.ids } },
      data: { isActive: data.isActive },
    });

    return NextResponse.json({ count: result.count });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    console.error(error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
