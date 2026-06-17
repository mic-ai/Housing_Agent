import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const houseMakers = await prisma.houseMaker.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
    select: { id: true, name: true, logoUrl: true, isActive: true },
  });
  return NextResponse.json({ data: houseMakers });
}
