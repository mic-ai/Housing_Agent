import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const venues = await prisma.venue.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
    select: { id: true, name: true, address: true, isActive: true },
  });
  return NextResponse.json({ data: venues });
}
