import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getViewerToken, ensureViewerProfile } from "@/lib/viewer";

const BodySchema = z.object({
  salespersonId: z.string(),
  videoId: z.string().optional(),
});

export async function GET() {
  const viewerToken = await getViewerToken();
  if (!viewerToken) return NextResponse.json({ error: "viewerToken cookie is missing" }, { status: 400 });

  const viewer = await prisma.viewerProfile.findUnique({ where: { viewerToken } });
  if (!viewer) return NextResponse.json({ data: [] });

  const data = await prisma.viewerSalespersonView.findMany({
    where: { viewerId: viewer.id },
    orderBy: { lastViewedAt: "desc" },
  });
  return NextResponse.json({ data });
}

export async function POST(request: NextRequest) {
  try {
    const body = BodySchema.parse(await request.json());
    const viewerToken = await getViewerToken();
    if (!viewerToken) return NextResponse.json({ error: "viewerToken cookie is missing" }, { status: 400 });

    const viewer = await ensureViewerProfile(viewerToken);
    const priorViewCount = await prisma.viewerSalespersonView.count({ where: { viewerId: viewer.id } });
    const data = await prisma.viewerSalespersonView.upsert({
      where: { viewerId_salespersonId: { viewerId: viewer.id, salespersonId: body.salespersonId } },
      update: { viewCount: { increment: 1 }, videoId: body.videoId },
      create: { viewerId: viewer.id, salespersonId: body.salespersonId, videoId: body.videoId },
    });
    return NextResponse.json({ data, firstView: priorViewCount === 0 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    console.error(error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
