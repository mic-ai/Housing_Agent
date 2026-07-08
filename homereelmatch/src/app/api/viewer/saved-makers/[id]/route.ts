import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getViewerToken } from "@/lib/viewer";

type Params = { params: Promise<{ id: string }> };

export async function DELETE(_request: NextRequest, { params }: Params): Promise<NextResponse> {
  const viewerToken = await getViewerToken();
  if (!viewerToken) return NextResponse.json({ error: "viewerToken cookie is missing" }, { status: 400 });

  const { id } = await params;
  const record = await prisma.viewerSavedMaker.findUnique({ where: { id } });
  if (!record) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const viewer = await prisma.viewerProfile.findUnique({ where: { viewerToken } });
  if (!viewer || record.viewerId !== viewer.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.viewerSavedMaker.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
