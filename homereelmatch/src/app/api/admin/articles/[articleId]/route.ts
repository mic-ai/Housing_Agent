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

const PatchSchema = z.object({
  phaseId: z.string().optional(),
  order: z.number().int().min(0).optional(),
  title: z.string().min(1).max(200).optional(),
  bodyMarkdown: z.string().min(1).optional(),
  estimatedMinutes: z.number().int().min(1).max(120).optional(),
  difficulty: z.enum(["BEGINNER", "BASIC"]).optional(),
  translateBoxLabel: z.string().max(100).nullable().optional(),
  translateBoxValue: z.string().max(500).nullable().optional(),
  status: z.enum(["DRAFT", "PUBLISHED"]).optional(),
  comparisonRows: z.array(ComparisonRowSchema).max(20).optional(),
});

type Params = { params: Promise<{ articleId: string }> };

export async function GET(_request: NextRequest, { params }: Params): Promise<NextResponse> {
  const denied = await requireAdmin();
  if (denied) return denied;

  const { articleId } = await params;
  const article = await prisma.article.findUnique({
    where: { id: articleId },
    include: { comparisonRows: { orderBy: { order: "asc" } } },
  });
  if (!article) {
    return NextResponse.json({ error: "Not Found" }, { status: 404 });
  }
  return NextResponse.json({ data: article });
}

export async function PATCH(request: NextRequest, { params }: Params): Promise<NextResponse> {
  const denied = await requireAdmin();
  if (denied) return denied;

  try {
    const { articleId } = await params;
    const body = await request.json();
    const { comparisonRows, status, ...data } = PatchSchema.parse(body);

    const existing = await prisma.article.findUnique({
      where: { id: articleId },
      select: { publishedAt: true },
    });
    if (!existing) {
      return NextResponse.json({ error: "Not Found" }, { status: 404 });
    }

    const article = await prisma.article.update({
      where: { id: articleId },
      data: {
        ...data,
        ...(status && {
          status,
          publishedAt: status === "PUBLISHED" ? (existing.publishedAt ?? new Date()) : existing.publishedAt,
        }),
        ...(comparisonRows && { comparisonRows: { deleteMany: {}, create: comparisonRows } }),
      },
      include: { comparisonRows: { orderBy: { order: "asc" } } },
    });

    return NextResponse.json({ data: article });
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

  try {
    const { articleId } = await params;
    await prisma.article.delete({ where: { id: articleId } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
