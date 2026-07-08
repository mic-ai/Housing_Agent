import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const phases = await prisma.learningPhase.findMany({
    where: { isActive: true },
    orderBy: { order: "asc" },
    select: { id: true, key: true, title: true, order: true, description: true },
  });
  return NextResponse.json({ data: phases });
}
