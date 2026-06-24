import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { uploadFaceVideo, buildFaceVideoPath } from "@/lib/storage";
import { getVideoDurationSec } from "@/lib/video-duration";
import { requireSalesperson } from "@/lib/admin";
import { auth } from "@/lib/auth";

const ALLOWED_TYPES = ["video/mp4", "video/webm", "video/quicktime"];
const MAX_SIZE_BYTES = 50 * 1024 * 1024; // 50MB
const MAX_DURATION_SEC = 10;

const BodySchema = z.object({
  salespersonId: z.string().min(1),
  videoId: z.string().min(1),
  type: z.enum(["pre", "post"]),
});

function extFromMime(mime: string): string {
  const map: Record<string, string> = {
    "video/mp4": "mp4",
    "video/webm": "webm",
    "video/quicktime": "mov",
  };
  return map[mime] ?? "mp4";
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const denied = await requireSalesperson();
  if (denied) return denied;

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const salespersonId = formData.get("salespersonId") as string | null;
    const videoId = formData.get("videoId") as string | null;
    const type = formData.get("type") as string | null;

    // Required fields validation
    const parsed = BodySchema.safeParse({ salespersonId, videoId, type });
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors }, { status: 400 });
    }
    if (!file) {
      return NextResponse.json({ error: "file is required" }, { status: 400 });
    }

    // Ownership: SALESPERSON can only upload for themselves
    const session = (await auth())!;
    if (session.user.role !== "ADMIN" && session.user.id !== parsed.data.salespersonId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // File type validation
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: `Invalid file type: ${file.type}. Allowed: ${ALLOWED_TYPES.join(", ")}` },
        { status: 400 }
      );
    }

    // File size validation
    if (file.size > MAX_SIZE_BYTES) {
      return NextResponse.json(
        { error: `File size ${file.size} exceeds limit of ${MAX_SIZE_BYTES} bytes` },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const ext = extFromMime(file.type);

    // Duration validation（ffprobe が使えない環境では null → スキップ）
    const durationSec = await getVideoDurationSec(buffer, ext);
    if (durationSec !== null && durationSec > MAX_DURATION_SEC) {
      return NextResponse.json(
        { error: `Duration ${durationSec}s exceeds maximum of ${MAX_DURATION_SEC}s` },
        { status: 400 }
      );
    }

    const { salespersonId: spId, videoId: vId, type: rollType } = parsed.data;
    const storagePath = buildFaceVideoPath(spId, vId, rollType, ext);
    const { publicUrl } = await uploadFaceVideo(buffer, storagePath, file.type);

    const resolvedDuration = durationSec !== null ? Math.round(durationSec) : 0;
    const updateFields =
      rollType === "pre"
        ? { preRollStoragePath: storagePath, preRollPublicUrl: publicUrl, preRollDurationSec: resolvedDuration }
        : { postRollStoragePath: storagePath, postRollPublicUrl: publicUrl, postRollDurationSec: resolvedDuration };

    const record = await prisma.salespersonVideo.upsert({
      where: { videoId_salespersonId: { videoId: vId, salespersonId: spId } },
      update: updateFields,
      create: { videoId: vId, salespersonId: spId, ...updateFields },
    });

    return NextResponse.json({
      salespersonVideoId: record.id,
      publicUrl,
      durationSec: resolvedDuration,
      type: rollType,
    });
  } catch (error) {
    console.error("[face-videos/upload]", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
