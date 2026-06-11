import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const ALLOWED_ORIGINS = (process.env.EMBED_ALLOWED_ORIGINS ?? "").split(",").filter(Boolean);

const QuerySchema = z.object({
  count: z.coerce.number().min(1).max(10).default(5),
  tag: z.string().optional(),
});

export async function GET(request: NextRequest) {
  const origin = request.headers.get("origin") ?? "";
  const isAllowed =
    ALLOWED_ORIGINS.length === 0 ||
    ALLOWED_ORIGINS.some((o) => o.trim() === origin);

  const corsHeaders: Record<string, string> = isAllowed
    ? {
        "Access-Control-Allow-Origin": origin,
        "Access-Control-Allow-Methods": "GET",
      }
    : {};

  if (!isAllowed) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403, headers: corsHeaders });
  }

  try {
    const { searchParams } = request.nextUrl;
    const query = QuerySchema.parse(Object.fromEntries(searchParams));

    const videos = await prisma.video.findMany({
      where: {
        isActive: true,
        ...(query.tag
          ? { videoHashtags: { some: { hashtag: { tagName: query.tag } } } }
          : {}),
      },
      take: query.count,
      orderBy: { createdAt: "desc" },
      include: { videoHashtags: { include: { hashtag: true } } },
    });

    const data = videos.map((v) => ({
      id: v.id,
      platform: v.platform,
      url: v.url,
      thumbnailUrl: v.thumbnailUrl,
      title: v.title,
      hashtags: v.videoHashtags.map((vh) => vh.hashtag.tagName),
    }));

    return NextResponse.json({ data }, { headers: corsHeaders });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400, headers: corsHeaders });
    }
    console.error(error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500, headers: corsHeaders });
  }
}

export async function OPTIONS(request: NextRequest) {
  const origin = request.headers.get("origin") ?? "";
  const isAllowed =
    ALLOWED_ORIGINS.length === 0 ||
    ALLOWED_ORIGINS.some((o) => o.trim() === origin);

  if (!isAllowed) {
    return new NextResponse(null, { status: 403 });
  }

  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": origin,
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Max-Age": "86400",
    },
  });
}
