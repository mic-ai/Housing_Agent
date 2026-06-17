import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin";
import { z } from "zod";

const CreateSchema = z.object({
  name: z.string().min(1).max(100),
  logoUrl: z.string().url().optional(),
});

export async function GET() {
  const denied = await requireAdmin();
  if (denied) return denied;

  const houseMakers = await prisma.houseMaker.findMany({
    orderBy: { name: "asc" },
  });
  return NextResponse.json({ data: houseMakers });
}

export async function POST(request: NextRequest) {
  const denied = await requireAdmin();
  if (denied) return denied;

  try {
    const body = await request.json();
    const data = CreateSchema.parse(body);
    const houseMaker = await prisma.houseMaker.create({ data });
    return NextResponse.json({ data: houseMaker }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    console.error(error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
