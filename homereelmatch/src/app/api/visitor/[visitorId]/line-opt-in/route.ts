import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ visitorId: string }> }
) {
  const { visitorId } = await params;
  try {
    const data = await prisma.visitor.update({
      where: { id: visitorId },
      data: { lineOptIn: true, lineOptInAt: new Date() },
      select: { id: true, lineOptIn: true, lineOptInAt: true },
    });
    return NextResponse.json({ data });
  } catch {
    return NextResponse.json({ error: "Not Found" }, { status: 404 });
  }
}
