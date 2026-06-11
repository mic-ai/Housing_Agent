import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const QuerySchema = z.object({
  tag: z.string().optional(),
  area: z.string().optional(),
  houseType: z.string().optional(),
  priceRange: z.string().optional(),
  q: z.string().optional(),
  limit: z.coerce.number().min(1).max(50).default(20),
  cursor: z.string().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const query = QuerySchema.parse(Object.fromEntries(searchParams));

    const where: Record<string, unknown> = { isActive: true };

    if (query.tag) {
      where.videoHashtags = {
        some: { hashtag: { tagName: query.tag } },
      };
    }
    if (query.area) where.area = query.area;
    if (query.houseType) where.houseType = query.houseType;
    if (query.priceRange) where.priceRange = query.priceRange;
    if (query.q) {
      where.OR = [
        { title: { contains: query.q, mode: "insensitive" } },
        {
          videoHashtags: {
            some: {
              hashtag: { tagName: { contains: query.q, mode: "insensitive" } },
            },
          },
        },
      ];
    }

    const videos = await prisma.video.findMany({
      where,
      take: query.limit + 1,
      ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
      orderBy: { createdAt: "desc" },
      include: {
        videoHashtags: { include: { hashtag: true } },
        salespersonVideos: {
          include: {
            salesperson: { include: { company: true } },
          },
        },
      },
    });

    const hasMore = videos.length > query.limit;
    const data = hasMore ? videos.slice(0, -1) : videos;
    const nextCursor = hasMore ? data[data.length - 1].id : null;

    return NextResponse.json({ data, nextCursor });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    console.error(error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

const CreateVideoSchema = z.object({
  platform: z.enum(["YOUTUBE", "INSTAGRAM"]),
  url: z.string().url(),
  thumbnailUrl: z.string().url().optional(),
  title: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  area: z.string().optional(),
  houseType: z.string().optional(),
  priceRange: z.string().optional(),
  hashtags: z.array(z.string()).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const data = CreateVideoSchema.parse(body);

    const video = await prisma.$transaction(async (tx) => {
      const created = await tx.video.create({
        data: {
          platform: data.platform,
          url: data.url,
          thumbnailUrl: data.thumbnailUrl,
          title: data.title,
          description: data.description,
          area: data.area,
          houseType: data.houseType,
          priceRange: data.priceRange,
        },
      });

      if (data.hashtags?.length) {
        for (const tagName of data.hashtags) {
          const hashtag = await tx.hashtag.upsert({
            where: { tagName },
            update: { usageCount: { increment: 1 } },
            create: { tagName, usageCount: 1 },
          });
          await tx.videoHashtag.create({
            data: { videoId: created.id, hashtagId: hashtag.id },
          });
        }
      }

      return created;
    });

    return NextResponse.json({ data: video }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    console.error(error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
