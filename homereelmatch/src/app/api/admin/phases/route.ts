import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin";
import { z } from "zod";

const CreateSchema = z.object({
  key: z.string().min(1).max(50),
  title: z.string().min(1).max(100),
  order: z.number().int().min(0),
  description: z.string().max(500).optional(),
  isActive: z.boolean().optional(),
});

export async function GET() {
  const denied = await requireAdmin();
  if (denied) return denied;

  const phases = await prisma.learningPhase.findMany({
    orderBy: { order: "asc" },
    include: { _count: { select: { articles: true } } },
  });
  return NextResponse.json({ data: phases });
}

export async function POST(request: NextRequest) {
  const denied = await requireAdmin();
  if (denied) return denied;

  try {
    const body = await request.json();
    const data = CreateSchema.parse(body);
    const phase = await prisma.learningPhase.create({ data });
    return NextResponse.json({ data: phase }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    console.error(error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
