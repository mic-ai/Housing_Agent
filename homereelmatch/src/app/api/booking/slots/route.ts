import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const QuerySchema = z.object({
  salespersonId: z.string(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const query = QuerySchema.parse(Object.fromEntries(searchParams));

    const now = new Date();
    const slots = await prisma.availableSlot.findMany({
      where: {
        salespersonId: query.salespersonId,
        isBooked: false,
        startAt: {
          gte: query.from ? new Date(query.from) : now,
          ...(query.to ? { lte: new Date(query.to) } : {}),
        },
      },
      orderBy: { startAt: "asc" },
    });

    return NextResponse.json({ data: slots });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    console.error(error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
