import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getViewerToken, ensureViewerProfile } from "@/lib/viewer";
import { VISITOR_ID_COOKIE } from "@/lib/viewer-cookie";

const BodySchema = z.object({
  source: z.string().min(1),
  videoId: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = BodySchema.parse(await request.json());
    const viewerToken = await getViewerToken();
    if (!viewerToken) {
      return NextResponse.json({ error: "viewerToken cookie is missing" }, { status: 400 });
    }

    const viewer = await ensureViewerProfile(viewerToken);
    const cookieStore = await cookies();
    const visitorId = cookieStore.get(VISITOR_ID_COOKIE)?.value;

    const data = await prisma.visitorVideoView.create({
      data: {
        viewerId: viewer.id,
        visitorId,
        videoId: body.videoId,
        source: body.source,
      },
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
