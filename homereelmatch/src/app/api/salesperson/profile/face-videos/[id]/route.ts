import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { deleteFaceVideo } from "@/lib/storage";
import { auth } from "@/lib/auth";

type Params = { params: Promise<{ id: string }> };

export async function DELETE(_request: NextRequest, { params }: Params): Promise<NextResponse> {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const record = await prisma.salespersonFaceVideo.findUnique({ where: { id } });
  if (!record) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (record.salespersonId !== session.user.id && session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    await deleteFaceVideo(record.storagePath);
  } catch {
    // ストレージ削除失敗はログのみ、DBレコードは削除する
  }

  await prisma.salespersonFaceVideo.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
