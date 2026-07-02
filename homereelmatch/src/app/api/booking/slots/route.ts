import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { requireSalesperson } from "@/lib/admin";
import { auth } from "@/lib/auth";

const CreateSlotSchema = z.object({
  salespersonId: z.string().min(1),
  startAt: z.string().datetime(),
  endAt: z.string().datetime(),
});

export async function POST(request: NextRequest): Promise<NextResponse> {
  const denied = await requireSalesperson();
  if (denied) return denied;

  try {
    const body = await request.json();
    const data = CreateSlotSchema.parse(body);

    const start = new Date(data.startAt);
    const end = new Date(data.endAt);
    if (start >= end) {
      return NextResponse.json({ error: "startAt は endAt より前である必要があります" }, { status: 400 });
    }

    // Ownership: SALESPERSON can only create slots for themselves
    const session = (await auth())!;
    if (session.user.role !== "ADMIN" && session.user.id !== data.salespersonId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const salesperson = await prisma.salesperson.findUnique({ where: { id: data.salespersonId }, select: { id: true } });
    if (!salesperson) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const slot = await prisma.availableSlot.create({
      data: { salespersonId: data.salespersonId, startAt: start, endAt: end },
    });
    return NextResponse.json({ data: slot }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    console.error(error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

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
