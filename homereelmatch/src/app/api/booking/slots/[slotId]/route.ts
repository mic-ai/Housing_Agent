import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ slotId: string }> };

export async function DELETE(_request: NextRequest, { params }: Params): Promise<NextResponse> {
  const { slotId } = await params;
  const slot = await prisma.availableSlot.findUnique({ where: { id: slotId } });
  if (!slot) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (slot.isBooked) {
    return NextResponse.json({ error: "予約済みのスロットは削除できません" }, { status: 409 });
  }
  await prisma.availableSlot.delete({ where: { id: slotId } });
  return NextResponse.json({ success: true });
}
