import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { requireSalesperson } from "@/lib/admin";
import { auth } from "@/lib/auth";

async function requireOwnedVideo(videoId: string): Promise<NextResponse | null> {
  const session = (await auth())!;
  if (session.user.role === "ADMIN") return null;
  const assignment = await prisma.salespersonVideo.findFirst({
    where: { videoId, salespersonId: session.user.id },
    select: { id: true },
  });
  if (!assignment) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  return null;
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ videoId: string }> }
) {
  try {
    const { videoId } = await params;
    const video = await prisma.video.findUnique({
      where: { id: videoId },
      include: {
        videoHashtags: { include: { hashtag: true } },
        salespersonVideos: {
          include: { salesperson: { include: { company: true } } },
        },
        houseMaker: true,
        venue: true,
      },
    });

    if (!video) {
      return NextResponse.json({ error: "Not Found" }, { status: 404 });
    }

    await prisma.video.update({
      where: { id: videoId },
      data: { viewCount: { increment: 1 } },
    });

    return NextResponse.json({ data: video });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

const PatchVideoSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(1000).optional(),
  houseMakerId: z.string().nullable().optional(),
  venueId: z.string().nullable().optional(),
  isActive: z.boolean().optional(),
  hashtags: z.array(z.string()).optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ videoId: string }> }
) {
  const denied = await requireSalesperson();
  if (denied) return denied;

  try {
    const { videoId } = await params;

    const ownershipDenied = await requireOwnedVideo(videoId);
    if (ownershipDenied) return ownershipDenied;

    const body = await request.json();
    const data = PatchVideoSchema.parse(body);

    const { hashtags, ...rest } = data;

    const video = await prisma.$transaction(async (tx) => {
      const updated = await tx.video.update({
        where: { id: videoId },
        data: rest,
      });

      if (hashtags !== undefined) {
        await tx.videoHashtag.deleteMany({ where: { videoId } });
        for (const tagName of hashtags) {
          const hashtag = await tx.hashtag.upsert({
            where: { tagName },
            update: { usageCount: { increment: 1 } },
            create: { tagName, usageCount: 1 },
          });
          await tx.videoHashtag.create({
            data: { videoId, hashtagId: hashtag.id },
          });
        }
      }

      return updated;
    });

    return NextResponse.json({ data: video });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    console.error(error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ videoId: string }> }
) {
  const denied = await requireSalesperson();
  if (denied) return denied;

  try {
    const { videoId } = await params;

    const ownershipDenied = await requireOwnedVideo(videoId);
    if (ownershipDenied) return ownershipDenied;

    await prisma.video.update({
      where: { id: videoId },
      data: { isActive: false },
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
