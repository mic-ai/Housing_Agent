import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin";
import { z } from "zod";

const QuerySchema = z.object({
  category: z.string().optional(),
  status: z.enum(["DRAFT", "PUBLISHED"]).optional(),
});

const CreateSchema = z.object({
  topic: z.string().min(1).max(200),
  category: z.string().min(1).max(50),
  title: z.string().min(1).max(200),
  bodyMarkdown: z.string().min(1),
});

export async function GET(request: NextRequest) {
  const denied = await requireAdmin();
  if (denied) return denied;

  try {
    const query = QuerySchema.parse(Object.fromEntries(request.nextUrl.searchParams));

    const entries = await prisma.agentKnowledgeEntry.findMany({
      where: {
        category: query.category,
        status: query.status,
      },
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        topic: true,
        category: true,
        title: true,
        status: true,
      },
    });
    return NextResponse.json({ data: entries });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    console.error(error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const denied = await requireAdmin();
  if (denied) return denied;

  try {
    const body = CreateSchema.parse(await request.json());
    const entry = await prisma.agentKnowledgeEntry.create({
      data: body,
      include: { sources: true },
    });
    return NextResponse.json({ data: entry }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    console.error(error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
