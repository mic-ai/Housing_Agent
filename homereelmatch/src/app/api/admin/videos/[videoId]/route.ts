import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin";
import { z } from "zod";

const PatchSchema = z.object({
  isActive: z.boolean().optional(),
  title: z.string().min(1).max(200).optional(),
  description: z.string().optional(),
  houseMakerId: z.string().nullable().optional(),
  venueId: z.string().nullable().optional(),
  sortOrder: z.number().int().min(0).optional(),
  hashtags: z.array(z.string()).optional(),
}).refine((d) => Object.keys(d).length > 0, { message: "At least one field required" });

type Params = { params: Promise<{ videoId: string }> };

export async function PATCH(request: NextRequest, { params }: Params): Promise<NextResponse> {
  const denied = await requireAdmin();
  if (denied) return denied;

  try {
    const { videoId } = await params;
    const body = await request.json();
    const { hashtags, ...videoFields } = PatchSchema.parse(body);

    if (hashtags === undefined) {
      const video = await prisma.video.update({ where: { id: videoId }, data: videoFields });
      return NextResponse.json({ data: video });
    }

    const video = await prisma.$transaction(async (tx) => {
      const updated = await tx.video.update({
        where: { id: videoId },
        data: videoFields,
      });
      await tx.videoHashtag.deleteMany({ where: { videoId } });
      for (const tagName of hashtags) {
        if (!tagName.trim()) continue;
        const hashtag = await tx.hashtag.upsert({
          where: { tagName: tagName.trim() },
          update: {},
          create: { tagName: tagName.trim() },
        });
        await tx.videoHashtag.create({ data: { videoId, hashtagId: hashtag.id } });
      }
      const refreshed = await tx.video.findUnique({
        where: { id: videoId },
        include: { videoHashtags: { include: { hashtag: true } } },
      });
      return { ...updated, videoHashtags: refreshed?.videoHashtags ?? [] };
    });

    return NextResponse.json({
      data: {
        ...video,
        hashtags: video.videoHashtags.map((vh) => vh.hashtag.tagName),
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    console.error(error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
