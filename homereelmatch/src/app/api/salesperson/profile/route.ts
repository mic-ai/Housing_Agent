import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const PatchSchema = z.object({
  name: z.string().min(1).optional(),
  bio: z.string().max(500).optional(),
  profileImage: z.string().url().optional().nullable(),
  houseMakerId: z.string().optional().nullable(),
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
      bio: true,
      profileImage: true,
      houseMakerId: true,
      houseMaker: { select: { id: true, name: true, logoUrl: true, isActive: true } },
      companyId: true,
      role: true,
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
        bio: true,
        profileImage: true,
        houseMakerId: true,
        houseMaker: { select: { id: true, name: true, logoUrl: true, isActive: true } },
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
