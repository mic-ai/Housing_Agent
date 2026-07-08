import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getViewerToken, ensureViewerProfile } from "@/lib/viewer";

const BodySchema = z.object({
  houseMakerId: z.string(),
});

export async function GET() {
  const viewerToken = await getViewerToken();
  if (!viewerToken) return NextResponse.json({ error: "viewerToken cookie is missing" }, { status: 400 });

  const viewer = await prisma.viewerProfile.findUnique({ where: { viewerToken } });
  if (!viewer) return NextResponse.json({ data: [] });

  const data = await prisma.viewerSavedMaker.findMany({
    where: { viewerId: viewer.id },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ data });
}

export async function POST(request: NextRequest) {
  try {
    const body = BodySchema.parse(await request.json());
    const viewerToken = await getViewerToken();
    if (!viewerToken) return NextResponse.json({ error: "viewerToken cookie is missing" }, { status: 400 });

    const viewer = await ensureViewerProfile(viewerToken);
    const data = await prisma.viewerSavedMaker.upsert({
      where: { viewerId_houseMakerId: { viewerId: viewer.id, houseMakerId: body.houseMakerId } },
      update: {},
      create: { viewerId: viewer.id, houseMakerId: body.houseMakerId },
    });
    return NextResponse.json({ data }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    console.error(error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
