import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { uploadProfileImage } from "@/lib/storage";
import { looksLikeAllowedImage } from "@/lib/file-sniff";

const ALLOWED_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};
const MAX_BYTES = 5 * 1024 * 1024; // 5MB

export async function POST(request: NextRequest): Promise<NextResponse> {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const formData = await request.formData();
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "ファイルが見つかりません" }, { status: 400 });
  }

  const ext = ALLOWED_TYPES[file.type];
  if (!ext) {
    return NextResponse.json(
      { error: "画像ファイル（JPEG/PNG/WebP）を選択してください" },
      { status: 400 }
    );
  }

  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "ファイルサイズは5MB以下にしてください" }, { status: 400 });
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    if (!looksLikeAllowedImage(buffer, file.type)) {
      return NextResponse.json({ error: "画像ファイルの内容が不正です" }, { status: 400 });
    }
    const { publicUrl } = await uploadProfileImage(buffer, session.user.id, ext, file.type);

    await prisma.salesperson.update({
      where: { id: session.user.id },
      data: { profileImage: publicUrl },
      select: { id: true },
    });

    return NextResponse.json({ data: { profileImage: publicUrl } });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "アップロードに失敗しました" }, { status: 500 });
  }
}
