import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { deleteFaceVideo } from "@/lib/storage";
import { requireSalesperson } from "@/lib/admin";
import { auth } from "@/lib/auth";

type Params = { params: Promise<{ salespersonVideoId: string }> };

export async function GET(_request: NextRequest, { params }: Params): Promise<NextResponse> {
  const denied = await requireSalesperson();
  if (denied) return denied;

  const { salespersonVideoId } = await params;
  const record = await prisma.salespersonVideo.findUnique({ where: { id: salespersonVideoId } });
  if (!record) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const session = (await auth())!;
  if (session.user.role !== "ADMIN" && session.user.id !== record.salespersonId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return NextResponse.json(record);
}

export async function DELETE(_request: NextRequest, { params }: Params): Promise<NextResponse> {
  const denied = await requireSalesperson();
  if (denied) return denied;

  const { salespersonVideoId } = await params;
  const record = await prisma.salespersonVideo.findUnique({ where: { id: salespersonVideoId } });
  if (!record) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const session = (await auth())!;
  if (session.user.role !== "ADMIN" && session.user.id !== record.salespersonId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Delete storage files first
  const storagePaths = [record.preRollStoragePath, record.postRollStoragePath].filter(Boolean) as string[];
  await Promise.all(storagePaths.map((p) => deleteFaceVideo(p)));

  await prisma.salespersonVideo.delete({ where: { id: salespersonVideoId } });
  return NextResponse.json({ success: true });
}
