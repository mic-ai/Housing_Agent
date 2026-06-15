import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const PatchSchema = z.object({
  status: z.enum(["PENDING", "RESPONDED", "APPOINTED", "CLOSED"]),
});

type Params = { params: Promise<{ contactRequestId: string }> };

export async function PATCH(request: NextRequest, { params }: Params): Promise<NextResponse> {
  try {
    const { contactRequestId } = await params;
    const body = await request.json();
    const data = PatchSchema.parse(body);

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
