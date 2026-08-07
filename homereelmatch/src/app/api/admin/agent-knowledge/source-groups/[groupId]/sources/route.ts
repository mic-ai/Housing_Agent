import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin";
import { z } from "zod";

const AddUrlSourceSchema = z.object({
  url: z.string().url().max(2000),
  title: z.string().max(200).optional(),
});

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

    const body = AddUrlSourceSchema.parse(await request.json());
    const source = await prisma.agentKnowledgeRegisteredSource.create({
      data: {
        groupId,
        sourceType: "URL",
        url: body.url,
        title: body.title ?? null,
      },
    });
    return NextResponse.json({ data: source }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    console.error(error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
