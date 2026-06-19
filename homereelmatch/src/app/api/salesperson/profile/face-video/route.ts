import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { uploadFaceVideo, buildSalespersonFaceVideoPath, deleteFaceVideo } from "@/lib/storage";
import { getVideoDurationSec } from "@/lib/video-duration";
import { auth } from "@/lib/auth";

const ALLOWED_TYPES = ["video/mp4", "video/webm", "video/quicktime"];
const MAX_SIZE_BYTES = 50 * 1024 * 1024;
const MAX_DURATION_SEC = 10;

const TypeSchema = z.enum(["pre", "post"]);

function extFromMime(mime: string): string {
  const map: Record<string, string> = {
    "video/mp4": "mp4",
    "video/webm": "webm",
    "video/quicktime": "mov",
  };
  return map[mime] ?? "mp4";
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const rawType = formData.get("type") as string | null;

    const parsedType = TypeSchema.safeParse(rawType);
    if (!parsedType.success) {
      return NextResponse.json({ error: "type must be 'pre' or 'post'" }, { status: 400 });
    }
    if (!file) {
      return NextResponse.json({ error: "file is required" }, { status: 400 });
    }
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: `Invalid file type: ${file.type}. Allowed: ${ALLOWED_TYPES.join(", ")}` },
        { status: 400 }
      );
    }
    if (file.size > MAX_SIZE_BYTES) {
      return NextResponse.json(
        { error: `File size exceeds limit of ${MAX_SIZE_BYTES} bytes` },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const ext = extFromMime(file.type);
    const durationSec = await getVideoDurationSec(buffer, ext);

    if (durationSec > MAX_DURATION_SEC) {
      return NextResponse.json(
        { error: `Duration ${durationSec}s exceeds maximum of ${MAX_DURATION_SEC}s` },
        { status: 400 }
      );
    }

    const rollType = parsedType.data;
    const salespersonId = session.user.id;
    const storagePath = buildSalespersonFaceVideoPath(salespersonId, rollType, ext);
    const { publicUrl } = await uploadFaceVideo(buffer, storagePath, file.type);

    const updateFields =
      rollType === "pre"
        ? { preRollStoragePath: storagePath, preRollPublicUrl: publicUrl, preRollDurationSec: Math.round(durationSec) }
        : { postRollStoragePath: storagePath, postRollPublicUrl: publicUrl, postRollDurationSec: Math.round(durationSec) };

    await prisma.salesperson.update({
      where: { id: salespersonId },
      data: updateFields,
    });

    return NextResponse.json({ publicUrl, durationSec: Math.round(durationSec), type: rollType });
  } catch (error) {
    console.error("[salesperson/profile/face-video POST]", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest): Promise<NextResponse> {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rawType = request.nextUrl.searchParams.get("type");
  const parsedType = TypeSchema.safeParse(rawType);
  if (!parsedType.success) {
    return NextResponse.json({ error: "type must be 'pre' or 'post'" }, { status: 400 });
  }

  try {
    const rollType = parsedType.data;
    const salespersonId = session.user.id;

    const salesperson = await prisma.salesperson.findUnique({
      where: { id: salespersonId },
      select: { preRollStoragePath: true, postRollStoragePath: true },
    });

    const storagePath =
      rollType === "pre" ? salesperson?.preRollStoragePath : salesperson?.postRollStoragePath;

    if (storagePath) {
      await deleteFaceVideo(storagePath);
    }

    const clearFields =
      rollType === "pre"
        ? { preRollStoragePath: null, preRollPublicUrl: null, preRollDurationSec: null }
        : { postRollStoragePath: null, postRollPublicUrl: null, postRollDurationSec: null };

    await prisma.salesperson.update({
      where: { id: salespersonId },
      data: clearFields,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[salesperson/profile/face-video DELETE]", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
