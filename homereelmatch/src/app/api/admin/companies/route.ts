import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin";

const CreateSchema = z.object({
  name: z.string().min(1).max(100),
  address: z.string().optional(),
  modelHouseName: z.string().optional(),
  modelHouseAddress: z.string().optional(),
});

export async function GET() {
  const denied = await requireAdmin();
  if (denied) return denied;

  const companies = await prisma.company.findMany({
    include: { _count: { select: { salespersons: true } } },
    orderBy: { name: "asc" },
  });

  return NextResponse.json({ companies });
}

export async function POST(request: NextRequest) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const body = await request.json();
  const parsed = CreateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.errors }, { status: 400 });

  const company = await prisma.company.create({ data: parsed.data });
  return NextResponse.json({ company }, { status: 201 });
}
