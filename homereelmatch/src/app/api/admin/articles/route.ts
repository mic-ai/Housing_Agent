import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin";
import { z } from "zod";

const ComparisonRowSchema = z.object({
  houseMakerId: z.string().nullable().optional(),
  priceRangeTag: z.string().max(50).nullable().optional(),
  featureTag: z.string().max(50).nullable().optional(),
  order: z.number().int().min(0).default(0),
});

const CreateSchema = z.object({
  phaseId: z.string(),
  order: z.number().int().min(0),
  title: z.string().min(1).max(200),
  bodyMarkdown: z.string().min(1),
  estimatedMinutes: z.number().int().min(1).max(120),
  difficulty: z.enum(["BEGINNER", "BASIC"]),
  translateBoxLabel: z.string().max(100).nullable().optional(),
  translateBoxValue: z.string().max(500).nullable().optional(),
  comparisonRows: z.array(ComparisonRowSchema).max(20).optional(),
});

const QuerySchema = z.object({
  phaseId: z.string().optional(),
});

export async function GET(request: NextRequest) {
  const denied = await requireAdmin();
  if (denied) return denied;

  try {
    const { searchParams } = request.nextUrl;
    const query = QuerySchema.parse(Object.fromEntries(searchParams));

    const articles = await prisma.article.findMany({
      where: query.phaseId ? { phaseId: query.phaseId } : undefined,
      orderBy: { order: "asc" },
      select: {
        id: true,
        phaseId: true,
        order: true,
        title: true,
        estimatedMinutes: true,
        difficulty: true,
        status: true,
        publishedAt: true,
      },
    });
    return NextResponse.json({ data: articles });
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
    const body = await request.json();
    const { comparisonRows, ...data } = CreateSchema.parse(body);
    const article = await prisma.article.create({
      data: {
        ...data,
        comparisonRows: comparisonRows ? { create: comparisonRows } : undefined,
      },
      include: { comparisonRows: true },
    });
    return NextResponse.json({ data: article }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    console.error(error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
