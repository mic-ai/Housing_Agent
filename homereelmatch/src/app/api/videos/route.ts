import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin";
import { mapVideoToDTO } from "@/lib/utils";

const videoInclude = {
  videoHashtags: { include: { hashtag: true } },
  salespersonVideos: {
    include: {
      salesperson: {
        select: {
          id: true,
          name: true,
          profileImage: true,
          toneQuote: true,
          company: {
            select: {
              id: true,
              name: true,
              modelHouseName: true,
              modelHouseAddress: true,
            },
          },
        },
      },
    },
  },
  houseMaker: true,
  venue: true,
} as const;

const QuerySchema = z.object({
  tag: z.string().optional(),
  venueId: z.string().optional(),
  houseMakerId: z.string().optional(),
  salespersonId: z.string().optional(),
  q: z.string().optional(),
  sortBy: z.enum(["sortOrder", "createdAt", "viewCount"]).default("sortOrder"),
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
    if (query.venueId) where.venueId = query.venueId;
    if (query.houseMakerId) where.houseMakerId = query.houseMakerId;
    if (query.salespersonId) {
      where.salespersonVideos = { some: { salespersonId: query.salespersonId } };
    }
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
      orderBy: query.sortBy === "viewCount"
        ? { viewCount: "desc" }
        : query.sortBy === "sortOrder"
          ? [{ sortOrder: "asc" }, { createdAt: "desc" }]
          : { createdAt: "desc" },
      include: videoInclude,
    });

    const hasMore = videos.length > query.limit;
    const data = hasMore ? videos.slice(0, -1) : videos;
    const nextCursor = hasMore ? data[data.length - 1].id : null;

    return NextResponse.json({ data: data.map(mapVideoToDTO), nextCursor });
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
  houseMakerId: z.string().optional(),
  venueId: z.string().optional(),
  hashtags: z.array(z.string()).optional(),
});

export async function POST(request: NextRequest) {
  const denied = await requireAdmin();
  if (denied) return denied;

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
          houseMakerId: data.houseMakerId,
          venueId: data.venueId,
          isActive: false,
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
