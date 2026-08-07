import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin";
import { deleteKnowledgeSourceFile } from "@/lib/storage";

type Params = { params: Promise<{ groupId: string; sourceId: string }> };

export async function DELETE(_request: NextRequest, { params }: Params): Promise<NextResponse> {
  const denied = await requireAdmin();
  if (denied) return denied;

  try {
    const { groupId, sourceId } = await params;
    const source = await prisma.agentKnowledgeRegisteredSource.findUnique({
      where: { id: sourceId },
      select: { groupId: true, sourceType: true, storagePath: true },
    });
    if (!source || source.groupId !== groupId) {
      return NextResponse.json({ error: "Not Found" }, { status: 404 });
    }

    if (source.sourceType === "PDF" && source.storagePath) {
      await deleteKnowledgeSourceFile(source.storagePath);
    }

    await prisma.agentKnowledgeRegisteredSource.delete({ where: { id: sourceId } });
    return NextResponse.json({ data: { id: sourceId } });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
