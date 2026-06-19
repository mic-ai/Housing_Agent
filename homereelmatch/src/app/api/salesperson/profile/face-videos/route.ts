import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { uploadFaceVideo, buildSalespersonFaceVideoPath } from "@/lib/storage";
import { getVideoDurationSec } from "@/lib/video-duration";
import { auth } from "@/lib/auth";

const ALLOWED_TYPES = ["video/mp4", "video/webm", "video/quicktime"];
const MAX_SIZE_BYTES = 50 * 1024 * 1024;
const MAX_DURATION_SEC = 10;

const RollTypeSchema = z.enum(["pre", "post"]);

function extFromMime(mime: string): string {
  const map: Record<string, string> = { "video/mp4": "mp4", "video/webm": "webm", "video/quicktime": "mov" };
  return map[mime] ?? "mp4";
}

export async function GET(_request: NextRequest): Promise<NextResponse> {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const data = await prisma.salespersonFaceVideo.findMany({
    where: { salespersonId: session.user.id },
    orderBy: [{ rollType: "asc" }, { sortOrder: "asc" }, { createdAt: "asc" }],
  });

  return NextResponse.json({ data });
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const rawType = formData.get("type") as string | null;

    const parsedType = RollTypeSchema.safeParse(rawType);
    if (!parsedType.success) {
      return NextResponse.json({ error: "type must be 'pre' or 'post'" }, { status: 400 });
    }
    if (!file) {
      return NextResponse.json({ error: "file is required" }, { status: 400 });
    }
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json({ error: `Invalid file type: ${file.type}` }, { status: 400 });
    }
    if (file.size > MAX_SIZE_BYTES) {
      return NextResponse.json({ error: "File size exceeds 50MB limit" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const ext = extFromMime(file.type);
    const durationSec = await getVideoDurationSec(buffer, ext);

    if (durationSec > MAX_DURATION_SEC) {
      return NextResponse.json({ error: `Duration ${durationSec}s exceeds maximum of ${MAX_DURATION_SEC}s` }, { status: 400 });
    }

    const rollType = parsedType.data;
    const salespersonId = session.user.id;
    const storagePath = buildSalespersonFaceVideoPath(salespersonId, rollType, ext);
    const { publicUrl } = await uploadFaceVideo(buffer, storagePath, file.type);

    const data = await prisma.salespersonFaceVideo.create({
      data: {
        salespersonId,
        rollType,
        storagePath,
        publicUrl,
        durationSec: Math.round(durationSec),
      },
    });

    return NextResponse.json({ data }, { status: 201 });
  } catch (error) {
    console.error("[face-videos POST]", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
