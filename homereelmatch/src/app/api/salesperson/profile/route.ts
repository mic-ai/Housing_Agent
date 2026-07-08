import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const PatchSchema = z.object({
  name: z.string().min(1).optional(),
  profileDetail: z.string().max(3000).optional().nullable(),
  profileImage: z.string().url().optional().nullable(),
  houseMakerId: z.string().optional().nullable(),
  toneQuote: z.string().max(60).optional().nullable(),
  yearsExperience: z.number().int().min(0).max(80).optional().nullable(),
  handoverCount: z.number().int().min(0).optional().nullable(),
});

export async function GET(_request: NextRequest): Promise<NextResponse> {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const salesperson = await prisma.salesperson.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      name: true,
      email: true,
      profileDetail: true,
      profileImage: true,
      houseMakerId: true,
      houseMaker: { select: { id: true, name: true, logoUrl: true, isActive: true } },
      companyId: true,
      role: true,
      toneQuote: true,
      yearsExperience: true,
      handoverCount: true,
    },
  });

  if (!salesperson) return NextResponse.json({ error: "Not Found" }, { status: 404 });
  return NextResponse.json({ data: salesperson });
}

export async function PATCH(request: NextRequest): Promise<NextResponse> {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = PatchSchema.parse(await request.json());
    const updated = await prisma.salesperson.update({
      where: { id: session.user.id },
      data: body,
      select: {
        id: true,
        name: true,
        profileDetail: true,
        profileImage: true,
        houseMakerId: true,
        houseMaker: { select: { id: true, name: true, logoUrl: true, isActive: true } },
        toneQuote: true,
        yearsExperience: true,
        handoverCount: true,
      },
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
