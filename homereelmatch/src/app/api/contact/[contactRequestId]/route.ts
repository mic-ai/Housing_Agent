import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { requireSalesperson } from "@/lib/admin";
import { auth } from "@/lib/auth";

const PatchSchema = z.object({
  status: z.enum(["PENDING", "RESPONDED", "APPOINTED", "CLOSED"]),
});

type Params = { params: Promise<{ contactRequestId: string }> };

export async function PATCH(request: NextRequest, { params }: Params): Promise<NextResponse> {
  const denied = await requireSalesperson();
  if (denied) return denied;

  try {
    const { contactRequestId } = await params;
    const body = await request.json();
    const data = PatchSchema.parse(body);

    const existing = await prisma.contactRequest.findUnique({ where: { id: contactRequestId } });
    if (!existing) return NextResponse.json({ error: "Not Found" }, { status: 404 });

    const session = (await auth())!;
    if (session.user.role !== "ADMIN" && session.user.id !== existing.salespersonId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const updated = await prisma.contactRequest.update({
      where: { id: contactRequestId },
      data: { status: data.status },
    });
    return NextResponse.json({ data: updated });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    console.error(error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
