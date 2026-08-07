import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin";
import { uploadKnowledgeSourceFile, buildKnowledgeSourcePath } from "@/lib/storage";
import { looksLikeAllowedPdf } from "@/lib/file-sniff";

const ALLOWED_TYPES = ["application/pdf"];
// base64化で~1.37倍になってもClaudeのリクエスト上限32MBに収まる想定
const MAX_SIZE_BYTES = 15 * 1024 * 1024;

type Params = { params: Promise<{ groupId: string }> };

export async function POST(request: NextRequest, { params }: Params): Promise<NextResponse> {
  const denied = await requireAdmin();
  if (denied) return denied;

  try {
    const { groupId } = await params;
    const group = await prisma.agentKnowledgeSourceGroup.findUnique({
      where: { id: groupId },
      select: { id: true },
    });
    if (!group) {
      return NextResponse.json({ error: "Not Found" }, { status: 404 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const title = formData.get("title") as string | null;

    if (!file) {
      return NextResponse.json({ error: "file is required" }, { status: 400 });
    }
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json({ error: `Invalid file type: ${file.type}` }, { status: 400 });
    }
    if (file.size > MAX_SIZE_BYTES) {
      return NextResponse.json({ error: "File size exceeds 15MB limit" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    if (!looksLikeAllowedPdf(buffer)) {
      return NextResponse.json({ error: "Invalid file content" }, { status: 400 });
    }

    const path = buildKnowledgeSourcePath(groupId, "pdf");
    const { path: storagePath, publicUrl } = await uploadKnowledgeSourceFile(buffer, path, "application/pdf");

    const source = await prisma.agentKnowledgeRegisteredSource.create({
      data: {
        groupId,
        sourceType: "PDF",
        storagePath,
        publicUrl,
        fileName: file.name,
        title: title || null,
      },
    });

    return NextResponse.json({ data: source }, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
