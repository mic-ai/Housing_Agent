import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin";
import { deleteFaceVideo } from "@/lib/storage";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ assignmentId: string }> }
) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const { assignmentId } = await params;

  const assignment = await prisma.salespersonVideo.findUnique({
    where: { id: assignmentId },
  });
  if (!assignment) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Storage上の顔出し動画も削除
  const paths = [assignment.preRollStoragePath, assignment.postRollStoragePath].filter(Boolean) as string[];
  await Promise.allSettled(paths.map((p) => deleteFaceVideo(p)));

  await prisma.salespersonVideo.delete({ where: { id: assignmentId } });

  return new NextResponse(null, { status: 204 });
}
