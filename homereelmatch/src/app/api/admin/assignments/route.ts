import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin";

const CreateSchema = z.object({
  salespersonId: z.string().min(1),
  videoId: z.string().min(1),
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function formatAssignment(a: any) {
  return {
    id: a.id as string,
    isPrimary: a.isPrimary as boolean,
    preRollPublicUrl: a.preRollPublicUrl as string | null,
    postRollPublicUrl: a.postRollPublicUrl as string | null,
    salesperson: {
      id: a.salesperson.id as string,
      name: a.salesperson.name as string,
      company: { name: (a.salesperson.company?.name ?? "") as string },
      faceVideos: (a.salesperson.faceVideos as { id: string; rollType: string; publicUrl: string; durationSec: number }[]).map((fv) => ({
        id: fv.id,
        rollType: fv.rollType as "pre" | "post",
        publicUrl: fv.publicUrl,
        durationSec: fv.durationSec,
      })),
    },
    video: {
      id: a.video.id as string,
      platform: a.video.platform as string,
      url: a.video.url as string,
      title: a.video.title as string,
      thumbnailUrl: a.video.thumbnailUrl as string | null,
      isActive: a.video.isActive as boolean,
      hashtags: (a.video.videoHashtags as { hashtag: { tagName: string } }[]).map((vh) => vh.hashtag.tagName),
    },
  };
}

export async function GET() {
  const denied = await requireAdmin();
  if (denied) return denied;

  const assignments = await prisma.salespersonVideo.findMany({
    select: {
      id: true,
      isPrimary: true,
      preRollPublicUrl: true,
      postRollPublicUrl: true,
      salesperson: {
        select: {
          id: true,
          name: true,
          company: { select: { name: true } },
          faceVideos: {
            select: { id: true, rollType: true, publicUrl: true, durationSec: true },
            orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
          },
        },
      },
      video: {
        select: {
          id: true,
          platform: true,
          url: true,
          title: true,
          thumbnailUrl: true,
          isActive: true,
          videoHashtags: { select: { hashtag: { select: { tagName: true } } } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ assignments: assignments.map(formatAssignment) });
}

export async function POST(request: NextRequest) {
  const denied = await requireAdmin();
  if (denied) return denied;

  try {
    const body = await request.json();
    const parsed = CreateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors }, { status: 400 });
    }

    const { salespersonId, videoId } = parsed.data;

    const [salesperson, video, existingCount] = await Promise.all([
      prisma.salesperson.findUnique({ where: { id: salespersonId }, select: { id: true } }),
      prisma.video.findUnique({ where: { id: videoId } }),
      prisma.salespersonVideo.count({ where: { videoId } }),
    ]);
    if (!salesperson) return NextResponse.json({ error: "Salesperson not found" }, { status: 404 });
    if (!video) return NextResponse.json({ error: "Video not found" }, { status: 404 });

    // 動画への最初の接続は isPrimary: true を自動設定
    const isFirstAssignment = existingCount === 0;

    const raw = await prisma.salespersonVideo.upsert({
      where: { videoId_salespersonId: { videoId, salespersonId } },
      update: {},
      create: { videoId, salespersonId, isPrimary: isFirstAssignment },
      select: {
        id: true,
        isPrimary: true,
        preRollPublicUrl: true,
        postRollPublicUrl: true,
        salesperson: {
          select: {
            id: true,
            name: true,
            company: { select: { name: true } },
            faceVideos: {
              select: { id: true, rollType: true, publicUrl: true, durationSec: true },
              orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
            },
          },
        },
        video: {
          select: {
            id: true,
            platform: true,
            url: true,
            title: true,
            thumbnailUrl: true,
            videoHashtags: { select: { hashtag: { select: { tagName: true } } } },
          },
        },
      },
    });

    return NextResponse.json({ assignment: formatAssignment(raw) }, { status: 201 });
  } catch (error) {
    console.error("[admin/assignments POST]", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
