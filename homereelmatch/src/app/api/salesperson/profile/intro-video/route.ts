import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { uploadFaceVideo, deleteFaceVideo, buildSalespersonIntroVideoPath } from "@/lib/storage";
import { getVideoDurationSec } from "@/lib/video-duration";
import { looksLikeAllowedVideo } from "@/lib/file-sniff";
import { auth } from "@/lib/auth";

const ALLOWED_TYPES = ["video/mp4", "video/webm", "video/quicktime"];
const MAX_SIZE_BYTES = 50 * 1024 * 1024;
const MAX_DURATION_SEC = 30;

function extFromMime(mime: string): string {
  const map: Record<string, string> = { "video/mp4": "mp4", "video/webm": "webm", "video/quicktime": "mov" };
  return map[mime] ?? "mp4";
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

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
    if (!looksLikeAllowedVideo(buffer)) {
      return NextResponse.json({ error: "Invalid file content" }, { status: 400 });
    }
    const ext = extFromMime(file.type);
    const durationSec = await getVideoDurationSec(buffer, ext);

    // ffprobe が利用可能な場合のみ尺チェック（Vercel 等では null になる）
    if (durationSec !== null && durationSec > MAX_DURATION_SEC) {
      return NextResponse.json({ error: `Duration ${durationSec}s exceeds maximum of ${MAX_DURATION_SEC}s` }, { status: 400 });
    }

    const salespersonId = session.user.id;

    const existing = await prisma.salesperson.findUnique({
      where: { id: salespersonId },
      select: { introVideoStoragePath: true },
    });
    if (existing?.introVideoStoragePath) {
      try {
        await deleteFaceVideo(existing.introVideoStoragePath);
      } catch {
        // ストレージ削除失敗はログのみ、新規アップロードは続行する
      }
    }

    const storagePath = buildSalespersonIntroVideoPath(salespersonId, ext);
    const { publicUrl } = await uploadFaceVideo(buffer, storagePath, file.type);

    const updated = await prisma.salesperson.update({
      where: { id: salespersonId },
      data: {
        introVideoUrl: publicUrl,
        introVideoStoragePath: storagePath,
        introVideoDurationSec: durationSec !== null ? Math.round(durationSec) : null,
      },
      select: { introVideoUrl: true, introVideoStoragePath: true, introVideoDurationSec: true },
    });

    return NextResponse.json({ data: updated }, { status: 201 });
  } catch (error) {
    console.error("[intro-video POST]", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(): Promise<NextResponse> {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const salespersonId = session.user.id;
  const existing = await prisma.salesperson.findUnique({
    where: { id: salespersonId },
    select: { introVideoStoragePath: true },
  });

  if (existing?.introVideoStoragePath) {
    try {
      await deleteFaceVideo(existing.introVideoStoragePath);
    } catch {
      // ストレージ削除失敗はログのみ、DBレコードは更新する
    }
  }

  await prisma.salesperson.update({
    where: { id: salespersonId },
    data: { introVideoUrl: null, introVideoStoragePath: null, introVideoDurationSec: null },
  });

  return NextResponse.json({ success: true });
}
