import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin";

type Params = { params: Promise<{ assignmentId: string }> };

const PatchSchema = z.object({
  preRollFaceVideoId: z.string().nullable().optional(),
  postRollFaceVideoId: z.string().nullable().optional(),
  isPrimary: z.literal(true).optional(),
});

export async function PATCH(request: NextRequest, { params }: Params): Promise<NextResponse> {
  const denied = await requireAdmin();
  if (denied) return denied;

  const { assignmentId } = await params;

  try {
    const body = await request.json();
    const { preRollFaceVideoId, postRollFaceVideoId, isPrimary } = PatchSchema.parse(body);

    // isPrimary: true の場合、同一動画の他接続を先にリセット
    if (isPrimary) {
      const assignment = await prisma.salespersonVideo.findUnique({
        where: { id: assignmentId },
        select: { videoId: true },
      });
      if (!assignment) return NextResponse.json({ error: "Not found" }, { status: 404 });

      await prisma.$transaction([
        prisma.salespersonVideo.updateMany({
          where: { videoId: assignment.videoId, id: { not: assignmentId } },
          data: { isPrimary: false },
        }),
        prisma.salespersonVideo.update({
          where: { id: assignmentId },
          data: { isPrimary: true },
        }),
      ]);

      return NextResponse.json({ data: { isPrimary: true } });
    }

    const updateData: Record<string, unknown> = {};

    if (preRollFaceVideoId !== undefined) {
      if (preRollFaceVideoId === null) {
        updateData.preRollStoragePath = null;
        updateData.preRollPublicUrl = null;
        updateData.preRollDurationSec = null;
      } else {
        const fv = await prisma.salespersonFaceVideo.findUnique({ where: { id: preRollFaceVideoId } });
        if (!fv) return NextResponse.json({ error: "Face video not found" }, { status: 404 });
        updateData.preRollStoragePath = fv.storagePath;
        updateData.preRollPublicUrl = fv.publicUrl;
        updateData.preRollDurationSec = fv.durationSec;
      }
    }

    if (postRollFaceVideoId !== undefined) {
      if (postRollFaceVideoId === null) {
        updateData.postRollStoragePath = null;
        updateData.postRollPublicUrl = null;
        updateData.postRollDurationSec = null;
      } else {
        const fv = await prisma.salespersonFaceVideo.findUnique({ where: { id: postRollFaceVideoId } });
        if (!fv) return NextResponse.json({ error: "Face video not found" }, { status: 404 });
        updateData.postRollStoragePath = fv.storagePath;
        updateData.postRollPublicUrl = fv.publicUrl;
        updateData.postRollDurationSec = fv.durationSec;
      }
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: "At least one field required" }, { status: 400 });
    }

    const updated = await prisma.salespersonVideo.update({
      where: { id: assignmentId },
      data: updateData,
    });

    return NextResponse.json({
      data: {
        preRollPublicUrl: updated.preRollPublicUrl,
        postRollPublicUrl: updated.postRollPublicUrl,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    console.error("[admin/assignments PATCH]", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: Params
) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const { assignmentId } = await params;

  const assignment = await prisma.salespersonVideo.findUnique({
    where: { id: assignmentId },
  });
  if (!assignment) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // 顔出し動画ファイルはSalespersonFaceVideoライブラリが管理するため、ここでは削除しない
  await prisma.salespersonVideo.delete({ where: { id: assignmentId } });

  return new NextResponse(null, { status: 204 });
}
