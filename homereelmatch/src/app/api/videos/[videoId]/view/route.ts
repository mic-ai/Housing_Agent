import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Fire-and-forget: increment viewCount when a video is viewed.
// No auth required. Returns 204 on success, 404 if video doesn't exist.
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ videoId: string }> }
) {
  const { videoId } = await params;

  try {
    await prisma.video.update({
      where: { id: videoId },
      data: { viewCount: { increment: 1 } },
      select: { id: true },
    });
    return new NextResponse(null, { status: 204 });
  } catch {
    // P2025 = record not found
    return NextResponse.json({ error: "Not Found" }, { status: 404 });
  }
}
