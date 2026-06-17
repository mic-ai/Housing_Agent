import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin";
import { z } from "zod";

const CreateSchema = z.object({
  name: z.string().min(1).max(100),
  address: z.string().optional(),
});

export async function GET() {
  const denied = await requireAdmin();
  if (denied) return denied;

  const venues = await prisma.venue.findMany({
    orderBy: { name: "asc" },
  });
  return NextResponse.json({ data: venues });
}

export async function POST(request: NextRequest) {
  const denied = await requireAdmin();
  if (denied) return denied;

  try {
    const body = await request.json();
    const data = CreateSchema.parse(body);
    const venue = await prisma.venue.create({ data });
    return NextResponse.json({ data: venue }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    console.error(error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
