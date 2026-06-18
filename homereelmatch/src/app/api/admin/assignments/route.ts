import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin";

const CreateSchema = z.object({
  salespersonId: z.string().min(1),
  videoId: z.string().min(1),
});

export async function GET() {
  const denied = await requireAdmin();
  if (denied) return denied;

  const assignments = await prisma.salespersonVideo.findMany({
    include: {
      salesperson: { select: { id: true, name: true, company: { select: { name: true } } } },
      video: { select: { id: true, title: true, thumbnailUrl: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ assignments });
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

    const [salesperson, video] = await Promise.all([
      prisma.salesperson.findUnique({ where: { id: salespersonId } }),
      prisma.video.findUnique({ where: { id: videoId } }),
    ]);
    if (!salesperson) return NextResponse.json({ error: "Salesperson not found" }, { status: 404 });
    if (!video) return NextResponse.json({ error: "Video not found" }, { status: 404 });

    const assignment = await prisma.salespersonVideo.upsert({
      where: { videoId_salespersonId: { videoId, salespersonId } },
      update: {},
      create: { videoId, salespersonId },
      include: {
        salesperson: { select: { id: true, name: true, company: { select: { name: true } } } },
        video: { select: { id: true, title: true, thumbnailUrl: true } },
      },
    });

    return NextResponse.json({ assignment }, { status: 201 });
  } catch (error) {
    console.error("[admin/assignments POST]", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
