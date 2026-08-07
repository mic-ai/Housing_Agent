import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin";
import { z } from "zod";

const PatchSchema = z.object({
  topic: z.string().min(1).max(200).optional(),
  category: z.string().min(1).max(50).optional(),
  title: z.string().min(1).max(200).optional(),
  bodyMarkdown: z.string().min(1).optional(),
  status: z.enum(["DRAFT", "PUBLISHED"]).optional(),
});

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: Params): Promise<NextResponse> {
  const denied = await requireAdmin();
  if (denied) return denied;

  const { id } = await params;
  const entry = await prisma.agentKnowledgeEntry.findUnique({
    where: { id },
    include: { sources: { orderBy: { createdAt: "asc" } } },
  });
  if (!entry) {
    return NextResponse.json({ error: "Not Found" }, { status: 404 });
  }
  return NextResponse.json({ data: entry });
}

export async function PATCH(request: NextRequest, { params }: Params): Promise<NextResponse> {
  const denied = await requireAdmin();
  if (denied) return denied;

  try {
    const { id } = await params;
    const body = await request.json();
    const { status, ...data } = PatchSchema.parse(body);

    const existing = await prisma.agentKnowledgeEntry.findUnique({
      where: { id },
      select: { publishedAt: true },
    });
    if (!existing) {
      return NextResponse.json({ error: "Not Found" }, { status: 404 });
    }

    const entry = await prisma.agentKnowledgeEntry.update({
      where: { id },
      data: {
        ...data,
        ...(status && {
          status,
          publishedAt: status === "PUBLISHED" ? (existing.publishedAt ?? new Date()) : existing.publishedAt,
        }),
      },
      include: { sources: { orderBy: { createdAt: "asc" } } },
    });

    return NextResponse.json({ data: entry });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    console.error(error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, { params }: Params): Promise<NextResponse> {
  const denied = await requireAdmin();
  if (denied) return denied;

  const { id } = await params;
  const existing = await prisma.agentKnowledgeEntry.findUnique({ where: { id }, select: { id: true } });
  if (!existing) {
    return NextResponse.json({ error: "Not Found" }, { status: 404 });
  }

  await prisma.agentKnowledgeEntry.delete({ where: { id } });
  return NextResponse.json({ data: { id } });
}
